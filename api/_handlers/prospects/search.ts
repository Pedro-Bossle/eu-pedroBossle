import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { GeminiError, searchLeadsWithGemini } from "../../_lib/gemini.js";
import {
  geminiApiKey,
  geminiConfigured,
  geminiModels,
} from "../../_lib/geminiEnv.js";
import {
  sanitizeProspect,
  upsertProspect,
  type ProspectLead,
} from "../../_lib/prospects.js";
import { rateLimit } from "../../_lib/rateLimit.js";

/** Busca leads novos com o Gemini (chave/modelo do env) e grava no Neon. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSession(req, res);
  if (!session) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  const body = readBody<{ niche?: string; city?: string; limit?: number }>(req);
  if (!body) return json(res, 400, { error: "JSON inválido" });
  const niche = String(body.niche ?? "").trim().slice(0, 80);
  const city = String(body.city ?? "").trim().slice(0, 80);
  const limit = Math.min(20, Math.max(3, Math.round(Number(body.limit) || 10)));
  if (niche.length < 3) {
    return json(res, 400, { error: "Informe o nicho (ex.: oficina mecânica)" });
  }
  if (city.length < 3) return json(res, 400, { error: "Informe a cidade" });

  const rl = rateLimit(`prospects-search:${session.sub}`, 4, 60_000);
  if (!rl.ok) {
    return json(res, 429, {
      error: `Muitas buscas neste painel. Espere ${rl.retryAfterSec}s (isso não é a cota do Google).`,
    });
  }

  if (!geminiConfigured()) {
    return json(res, 400, {
      error:
        "GEMINI_API_KEY não configurada no ambiente. Defina no .env / Vercel e redeploy.",
    });
  }

  const apiKey = geminiApiKey();
  const models = geminiModels();

  try {
    const skip = await withAuth(async (db) => {
      const existing = await db.query(
        `SELECT name FROM prospect_leads WHERE lower(city) = lower($1)
         ORDER BY created_at DESC LIMIT 60`,
        [city],
      );
      return existing.rows.map((r) => String(r.name));
    });

    const { leads: found, queries, model } = await searchLeadsWithGemini({
      apiKey,
      models,
      niche,
      city,
      limit,
      skip,
    });

    const saved = await withAuth(async (db) => {
      const out: { lead: ProspectLead; inserted: boolean }[] = [];
      for (const g of found) {
        const clean = sanitizeProspect({
          ...g,
          niche: g.niche || niche,
          city,
          source: "gemini",
        });
        if (!clean.name) continue;
        out.push(await upsertProspect(db, clean));
      }
      return out;
    });

    return json(res, 200, {
      added: saved.filter((s) => s.inserted).length,
      updated: saved.filter((s) => !s.inserted).length,
      leads: saved.map((s) => s.lead),
      queries,
      model,
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      return json(res, error.status, {
        error: error.message,
        code: error.code,
        detail: error.detail || undefined,
      });
    }
    console.error(error);
    return json(res, 500, { error: "Falha na busca com o Gemini" });
  }
}
