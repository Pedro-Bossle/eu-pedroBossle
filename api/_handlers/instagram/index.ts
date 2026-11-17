import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { connectIg, deleteIgCredential, loadIgCredential } from "../../_lib/instagram.js";
import { POST_COLS, mapComment, mapMedia, mapPost } from "../../_lib/igMappers.js";

/**
 * GET → tudo que a tela do Instagram precisa (conta, posts do painel, biblioteca, comentários)
 * POST { token } → conecta a conta com um token de acesso
 * DELETE → desconecta (apaga o token)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const data = await withAuth(async (db) => {
        const cred = await loadIgCredential(db).catch(() => null);
        const posts = await db.query(
          `SELECT ${POST_COLS} FROM ig_posts ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT 500`,
        );
        const media = await db.query(`SELECT * FROM ig_media ORDER BY posted_at DESC NULLS LAST LIMIT 300`);
        const comments = await db.query(
          `SELECT c.*, m.permalink, COALESCE(NULLIF(m.thumbnail_url, ''), m.media_url) AS thumb,
                  left(m.caption, 120) AS media_caption
           FROM ig_comments c JOIN ig_media m ON m.id = c.media_id
           WHERE c.status <> 'arquivado' OR c.posted_at > now() - interval '30 days'
           ORDER BY c.posted_at DESC NULLS LAST LIMIT 400`,
        );
        return {
          account: cred
            ? { connected: true, ...cred.meta, expiresAt: cred.expiresAt?.toISOString() ?? null }
            : { connected: false },
          posts: posts.rows.map(mapPost),
          media: media.rows.map(mapMedia),
          comments: comments.rows.map(mapComment),
        };
      });
      return json(res, 200, {
        ...data,
        features: {
          oauth: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
          upload: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
          cron: Boolean(process.env.CRON_SECRET),
        },
      });
    }

    if (req.method === "POST") {
      const body = readBody<{ token?: string }>(req);
      const token = String(body?.token ?? "").trim();
      if (token.length < 20) return json(res, 400, { error: "Cole o token de acesso do Instagram" });
      const meta = await withAuth((db) => connectIg(db, token));
      return json(res, 200, { account: { connected: true, ...meta } });
    }

    if (req.method === "DELETE") {
      await withAuth((db) => deleteIgCredential(db));
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("instagram:", error);
    return json(res, 502, {
      error: error instanceof Error ? error.message : "Falha no Instagram",
    });
  }
}
