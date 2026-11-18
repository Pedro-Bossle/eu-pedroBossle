import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { ig, loadIgCredential } from "../../_lib/instagram.js";

const STATUSES = ["novo", "respondido", "arquivado"];

/**
 * Comentários (CRM).
 * PATCH { id | ids[], status } → muda status
 * POST { id, action: "reply", message } | { id, action: "hide" | "unhide" | "delete" }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "PATCH") {
      const b = readBody<{ id?: string; ids?: string[]; status?: string }>(req);
      const ids = (b?.ids ?? (b?.id ? [b.id] : [])).map(String).filter((x) => /^\d{5,30}$/.test(x));
      if (!ids.length || !STATUSES.includes(String(b?.status))) return json(res, 400, { error: "Dados inválidos" });
      await withAuth((db) => db.query(`UPDATE ig_comments SET status = $2 WHERE id = ANY($1)`, [ids, b!.status]));
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST") {
      const b = readBody<{ id?: string; action?: string; message?: string }>(req);
      const id = String(b?.id ?? "");
      if (!/^\d{5,30}$/.test(id)) return json(res, 400, { error: "id inválido" });

      const out = await withAuth(async (db) => {
        const cred = await loadIgCredential(db);
        if (!cred) return { status: 400, body: { error: "Conecte o Instagram primeiro" } };
        const { rows } = await db.query(`SELECT media_id, parent_id FROM ig_comments WHERE id = $1`, [id]);
        const c = rows[0];
        if (!c) return { status: 404, body: { error: "Comentário não encontrado" } };

        if (b?.action === "reply") {
          const message = String(b.message ?? "").trim().slice(0, 2200);
          if (!message) return { status: 400, body: { error: "Escreva a resposta" } };
          // Respostas sempre vão para o comentário raiz (o Instagram não aninha mais que 1 nível)
          const target = c.parent_id ? String(c.parent_id) : id;
          const r = await ig<{ id: string }>(cred.token, `${target}/replies`, {
            method: "POST",
            params: { message },
          });
          await db.query(
            `INSERT INTO ig_comments (id, media_id, parent_id, username, text, posted_at, from_me, status)
             VALUES ($1, $2, $3, $4, $5, now(), true, 'respondido') ON CONFLICT (id) DO NOTHING`,
            [r.id, c.media_id, target, cred.meta.username, message],
          );
          await db.query(`UPDATE ig_comments SET status = 'respondido' WHERE id = ANY($1) AND status = 'novo'`, [
            [id, target],
          ]);
          return { status: 200, body: { ok: true, replyId: r.id } };
        }
        if (b?.action === "hide" || b?.action === "unhide") {
          await ig(cred.token, id, { method: "POST", params: { hide: b.action === "hide" } });
          await db.query(`UPDATE ig_comments SET hidden = $2 WHERE id = $1`, [id, b.action === "hide"]);
          return { status: 200, body: { ok: true } };
        }
        if (b?.action === "delete") {
          await ig(cred.token, id, { method: "DELETE" });
          await db.query(`DELETE FROM ig_comments WHERE id = $1 OR parent_id = $1`, [id]);
          return { status: 200, body: { ok: true } };
        }
        return { status: 400, body: { error: "Ação inválida" } };
      });
      return json(res, out.status, out.body);
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("instagram comments:", error);
    return json(res, 502, { error: error instanceof Error ? error.message : "Falha no comentário" });
  }
}
