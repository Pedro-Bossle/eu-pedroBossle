import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { loadRules } from "../../_lib/prospectFunnel.js";

/**
 * Regras do funil que valem para os bots.
 * GET → { rules }   PUT { cities: string[], allowWebsite: boolean } → { rules }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      return json(res, 200, { rules: await withAuth((db) => loadRules(db)) });
    }
    if (req.method !== "PUT") return json(res, 405, { error: "Method not allowed" });

    const body = readBody<{ cities?: unknown; allowWebsite?: unknown }>(req);
    if (!body) return json(res, 400, { error: "JSON inválido" });
    const seen = new Set<string>();
    const cities = (Array.isArray(body.cities) ? body.cities : [])
      .map((c) => String(c ?? "").trim().replace(/\s+/g, " ").slice(0, 80))
      .filter((c) => c && !seen.has(c.toLowerCase()) && seen.add(c.toLowerCase()))
      .slice(0, 200);
    const allowWebsite = body.allowWebsite !== false;

    const rules = await withAuth(async (db) => {
      await db.query(
        `INSERT INTO prospect_rules (id, cities, allow_website, updated_at) VALUES (true, $1, $2, now())
         ON CONFLICT (id) DO UPDATE SET cities = EXCLUDED.cities, allow_website = EXCLUDED.allow_website, updated_at = now()`,
        [cities, allowWebsite],
      );
      return loadRules(db);
    });
    return json(res, 200, { rules });
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error && /prospect_rules/.test(error.message) ? "Rode a migration 019_prospect_rules.sql" : "Falha ao salvar as regras";
    return json(res, 500, { error: msg });
  }
}
