import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { newBotToken } from "../../_lib/prospectFunnel.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tokens dos bots (sessão do Pedro).
 * GET → lista (sem o token)
 * POST { name, role: "prospector" | "executor" } → cria e devolve o token UMA vez
 * DELETE ?id=… → revoga
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const tokens = await withAuth(async (db) => {
        const { rows } = await db.query(
          `SELECT id, name, role, last4, created_at, last_used_at, revoked_at
           FROM bot_tokens ORDER BY created_at DESC`,
        );
        return rows;
      });
      return json(res, 200, { tokens });
    }

    if (req.method === "POST") {
      const body = readBody<{ name?: string; role?: string }>(req);
      const name = String(body?.name ?? "").trim().slice(0, 60);
      const role = String(body?.role ?? "");
      if (!name) return json(res, 400, { error: "Dê um nome ao bot" });
      if (role !== "prospector" && role !== "executor") {
        return json(res, 400, { error: "Papel deve ser prospector ou executor" });
      }
      const t = newBotToken();
      const row = await withAuth(async (db) => {
        const { rows } = await db.query(
          `INSERT INTO bot_tokens (name, role, token_hash, last4)
           VALUES ($1, $2, $3, $4) RETURNING id, name, role, last4, created_at`,
          [name, role, t.hash, t.last4],
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
    return json(res, 500, { error: "Falha nos tokens dos bots" });
  }
}
