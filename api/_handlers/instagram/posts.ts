import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { POST_COLS, cleanTags, mapPost } from "../../_lib/igMappers.js";
import { publishDue } from "../../_lib/instagram.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ["image", "carousel", "reel", "story"] as const;

type Body = {
  id?: string;
  kind?: string;
  caption?: string;
  mediaUrls?: unknown;
  coverUrl?: string;
  shareToFeed?: boolean;
  scheduledAt?: string | null;
  /** "rascunho" guarda sem data; "agendado" exige data; "agora" publica já. */
  mode?: "rascunho" | "agendado" | "agora";
  tags?: unknown;
  notes?: string;
};

function validUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Posts do calendário.
 * POST → cria/atualiza (e publica na hora com mode "agora")
 * PATCH { id, scheduledAt } → arrasta no calendário
 * DELETE ?id → apaga (posts publicados só somem do painel, não do Instagram)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "POST") {
      const b = readBody<Body>(req);
      if (!b) return json(res, 400, { error: "JSON inválido" });
      const kind = (KINDS as readonly string[]).includes(String(b.kind)) ? String(b.kind) : "image";
      const caption = String(b.caption ?? "").slice(0, 2200);
      const urls = (Array.isArray(b.mediaUrls) ? b.mediaUrls : [])
        .map((u) => String(u).trim())
        .filter(Boolean)
        .slice(0, 10);
      const bad = urls.find((u) => !validUrl(u));
      if (bad) return json(res, 400, { error: `URL inválida (precisa ser https pública): ${bad}` });
      const cover = String(b.coverUrl ?? "").trim();
      if (cover && !validUrl(cover)) return json(res, 400, { error: "URL da capa inválida" });
      const hashtags = (caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
      if (hashtags > 30) return json(res, 400, { error: "O Instagram aceita no máximo 30 hashtags" });

      const mode = b.mode ?? "rascunho";
      let scheduledAt: Date | null = b.scheduledAt ? new Date(b.scheduledAt) : null;
      if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return json(res, 400, { error: "Data inválida" });
      let status = "rascunho";
      if (mode === "agendado") {
        if (!scheduledAt) return json(res, 400, { error: "Escolha data e hora" });
        if (!urls.length) return json(res, 400, { error: "Adicione a mídia antes de agendar" });
        status = "agendado";
      } else if (mode === "agora") {
        if (!urls.length) return json(res, 400, { error: "Adicione a mídia antes de publicar" });
        scheduledAt = new Date();
        status = "agendado";
      }

      const params = [
        kind,
        caption,
        urls,
        cover,
        b.shareToFeed !== false,
        scheduledAt,
        status,
        cleanTags(b.tags),
        String(b.notes ?? "").slice(0, 2000),
      ];

      const saved = await withAuth(async (db) => {
        if (b.id) {
          if (!UUID.test(b.id)) return { error: "id inválido" } as const;
          const { rows } = await db.query(
            `UPDATE ig_posts SET kind = $2, caption = $3, media_urls = $4, cover_url = $5,
               share_to_feed = $6, scheduled_at = $7, status = $8, tags = $9, notes = $10,
               container_id = '', child_ids = '{}', error = '', attempts = 0, updated_at = now()
             WHERE id = $1 AND status IN ('rascunho', 'agendado', 'erro')
             RETURNING ${POST_COLS}`,
            [b.id, ...params],
          );
          if (!rows[0]) return { error: "Esse post já foi publicado ou está publicando" } as const;
          return { post: rows[0] };
        }
        const { rows } = await db.query(
          `INSERT INTO ig_posts (kind, caption, media_urls, cover_url, share_to_feed, scheduled_at, status, tags, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${POST_COLS}`,
          params,
        );
        return { post: rows[0] };
      });
      if ("error" in saved) return json(res, 409, { error: saved.error });

      let post = mapPost(saved.post as Record<string, unknown>);
      if (mode === "agora") {
        const result = await publishDue(withAuth, post.id);
        const fresh = await withAuth((db) => db.query(`SELECT ${POST_COLS} FROM ig_posts WHERE id = $1`, [post.id]));
        post = mapPost(fresh.rows[0] as Record<string, unknown>);
        return json(res, 200, { post, publish: result });
      }
      return json(res, 200, { post });
    }

    if (req.method === "PATCH") {
      const b = readBody<{ id?: string; scheduledAt?: string }>(req);
      const id = String(b?.id ?? "");
      const when = new Date(String(b?.scheduledAt ?? ""));
      if (!UUID.test(id) || Number.isNaN(when.getTime())) return json(res, 400, { error: "Dados inválidos" });
      const { rows } = await withAuth((db) =>
        db.query(
          `UPDATE ig_posts SET scheduled_at = $2, updated_at = now()
           WHERE id = $1 AND status IN ('rascunho', 'agendado', 'erro') RETURNING ${POST_COLS}`,
          [id, when],
        ),
      );
      if (!rows[0]) return json(res, 409, { error: "Esse post não pode mais ser movido" });
      return json(res, 200, { post: mapPost(rows[0] as Record<string, unknown>) });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "");
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      await withAuth((db) => db.query(`DELETE FROM ig_posts WHERE id = $1 AND status <> 'publicando'`, [id]));
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("instagram posts:", error);
    return json(res, 500, { error: error instanceof Error ? error.message : "Falha nos posts" });
  }
}
