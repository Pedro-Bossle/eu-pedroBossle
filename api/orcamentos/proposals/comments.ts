import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession, json, readBody } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapComment } from "../../_lib/mappers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const proposalId = String(req.query.proposalId ?? "").trim();
      if (!proposalId) return json(res, 400, { error: "proposalId obrigatório" });

      const comments = await withAuth(async (db) => {
        const { rows } = await db.query(
          `SELECT id, author, body, created_at
           FROM proposal_comments
           WHERE proposal_id = $1
           ORDER BY created_at ASC`,
          [proposalId],
        );
        return rows.map(mapComment);
      });
      return json(res, 200, { comments });
    }

    if (req.method === "POST") {
      const body = readBody<{ proposalId?: string; body?: string }>(req);
      if (!body) return json(res, 400, { error: "JSON inválido" });

      const proposalId = String(body.proposalId ?? "").trim();
      const text = String(body.body ?? "").trim();
      if (!proposalId) return json(res, 400, { error: "proposalId obrigatório" });
      if (!text) return json(res, 400, { error: "Comentário vazio" });

      const comment = await withAuth(async (db) => {
        const { rows: proposals } = await db.query(
          "SELECT id FROM proposals WHERE id = $1",
          [proposalId],
        );
        if (!proposals[0]) return null;

        const { rows } = await db.query(
          `INSERT INTO proposal_comments (proposal_id, author, body)
           VALUES ($1, 'admin', $2)
           RETURNING id, author, body, created_at`,
          [proposalId, text],
        );
        return mapComment(rows[0]);
      });

      if (!comment) return json(res, 404, { error: "Proposta não encontrada" });
      return json(res, 200, { comment });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha em comentários" });
  }
}
