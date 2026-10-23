import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { GEMINI_DEFAULT_MODEL } from "../../_lib/gemini.js";
import { encryptSecret } from "../../_lib/secrets.js";

const MODEL_RE = /^[a-z0-9][a-z0-9.\-]{2,60}$/i;

type SettingsRow = { api_key_last4: string; model: string; updated_at: Date | string };

function view(row: SettingsRow | undefined) {
  return {
    configured: Boolean(row?.api_key_last4),
    last4: row?.api_key_last4 ?? "",
    model: row?.model || GEMINI_DEFAULT_MODEL,
    defaultModel: GEMINI_DEFAULT_MODEL,
    updated:
      row?.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : row?.updated_at
          ? String(row.updated_at)
          : null,
  };
}

/** Configuração do Gemini. A chave nunca volta para o navegador, só os 4 últimos caracteres. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const row = await withAuth(async (db) => {
        const { rows } = await db.query(
          "SELECT api_key_last4, model, updated_at FROM integration_settings WHERE provider = 'gemini'",
        );
        return rows[0] as SettingsRow | undefined;
      });
      return json(res, 200, { settings: view(row) });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = readBody<{ apiKey?: string; model?: string }>(req);
      if (!body) return json(res, 400, { error: "JSON inválido" });

      const apiKey = String(body.apiKey ?? "").trim();
      const model = String(body.model ?? "").trim() || GEMINI_DEFAULT_MODEL;
      if (!MODEL_RE.test(model)) return json(res, 400, { error: "Modelo inválido" });
      if (apiKey && !/^[A-Za-z0-9_\-.]{20,200}$/.test(apiKey)) {
        return json(res, 400, { error: "Essa chave não parece uma chave da API do Gemini" });
      }

      const row = await withAuth(async (db) => {
        if (apiKey) {
          await db.query(
            `INSERT INTO integration_settings (provider, api_key_enc, api_key_last4, model, updated_at)
             VALUES ('gemini', $1, $2, $3, now())
             ON CONFLICT (provider) DO UPDATE SET
               api_key_enc = EXCLUDED.api_key_enc,
               api_key_last4 = EXCLUDED.api_key_last4,
               model = EXCLUDED.model,
               updated_at = now()`,
            [encryptSecret(apiKey), apiKey.slice(-4), model],
          );
        } else {
          // Só troca o modelo, mantendo a chave salva
          await db.query(
            `INSERT INTO integration_settings (provider, model, updated_at)
             VALUES ('gemini', $1, now())
             ON CONFLICT (provider) DO UPDATE SET model = EXCLUDED.model, updated_at = now()`,
            [model],
          );
        }
        const { rows } = await db.query(
          "SELECT api_key_last4, model, updated_at FROM integration_settings WHERE provider = 'gemini'",
        );
        return rows[0] as SettingsRow | undefined;
      });
      return json(res, 200, { settings: view(row) });
    }

    if (req.method === "DELETE") {
      await withAuth(async (db) => {
        await db.query("DELETE FROM integration_settings WHERE provider = 'gemini'");
      });
      return json(res, 200, { settings: view(undefined) });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao salvar a configuração do Gemini" });
  }
}
