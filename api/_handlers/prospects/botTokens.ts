import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { BOT_SCOPES, isBotScope, newBotToken, type BotScope } from "../../_lib/prospectFunnel.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tokens dos bots (sessão do Pedro).
 * GET → lista (sem o token)
 * POST { name, scopes: ("funil" | "mensagens" | "instagram")[] } → cria e devolve o token UMA vez
 *   (aceita ainda o antigo { role: "prospector" | "executor" })
 * DELETE ?id=… → revoga
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const tokens = await withAuth(async (db) => {
        const { rows } = await db.query(
          `SELECT id, name, role, last4, created_at, last_used_at, revoked_at,
                  to_jsonb(bot_tokens.*) -> 'scopes' AS scopes
           FROM bot_tokens ORDER BY created_at DESC`,
        );
        // Chaves de antes do 021: deduz a permissão pelo papel
        return rows.map((r) => {
          const scopes = (Array.isArray(r.scopes) ? r.scopes : []).filter(isBotScope);
          if (!scopes.length && r.role === "prospector") scopes.push("funil");
          if (!scopes.length && r.role === "executor") scopes.push("mensagens");
          return { ...r, scopes };
        });
      });
      return json(res, 200, { tokens });
    }

    if (req.method === "POST") {
      const body = readBody<{ name?: string; role?: string; scopes?: unknown }>(req);
      const name = String(body?.name ?? "").trim().slice(0, 60);
      if (!name) return json(res, 400, { error: "Dê um nome ao bot" });
      let scopes: BotScope[] = Array.isArray(body?.scopes)
        ? BOT_SCOPES.filter((s) => (body!.scopes as unknown[]).includes(s))
        : [];
      if (!scopes.length && body?.role === "prospector") scopes = ["funil"];
      if (!scopes.length && body?.role === "executor") scopes = ["mensagens"];
      if (!scopes.length) {
        return json(res, 400, { error: "Escolha ao menos uma permissão: funil, mensagens ou instagram" });
      }
      // Papel antigo, mantido para o histórico do funil
      const role = scopes.includes("funil") ? "prospector" : scopes.includes("mensagens") ? "executor" : null;
      const t = newBotToken();
      const row = await withAuth(async (db) => {
        const { rows } = await db.query(
          `INSERT INTO bot_tokens (name, role, scopes, token_hash, last4)
           VALUES ($1, $2, $3, $4, $5) RETURNING id, name, role, scopes, last4, created_at`,
          [name, role, scopes, t.hash, t.last4],
        );
        return rows[0];
      });
      // O token em texto só existe nesta resposta
      return json(res, 201, { token: t.token, bot: row });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "").trim();
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      await withAuth((db) =>
        db.query(`UPDATE bot_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`, [id]),
      );
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    const missing = error instanceof Error && /scopes/.test(error.message);
    return json(res, 500, {
      error: missing ? "Rode a migração db/021_bot_scopes.sql no Neon" : "Falha nos tokens dos bots",
    });
  }
}
