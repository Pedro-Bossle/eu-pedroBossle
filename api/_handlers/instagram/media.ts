import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { cleanTags, mapMedia } from "../../_lib/igMappers.js";

/** PATCH { id, tags?, notes? } → etiquetas e anotações da biblioteca. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "PATCH") return json(res, 405, { error: "Method not allowed" });
  const b = readBody<{ id?: string; tags?: unknown; notes?: string }>(req);
  const id = String(b?.id ?? "").trim();
  if (!/^\d{5,30}$/.test(id)) return json(res, 400, { error: "id inválido" });
  try {
    const { rows } = await withAuth((db) =>
      db.query(
        `UPDATE ig_media SET tags = COALESCE($2, tags), notes = COALESCE($3, notes) WHERE id = $1 RETURNING *`,
        [id, b?.tags === undefined ? null : cleanTags(b.tags), b?.notes === undefined ? null : String(b.notes).slice(0, 2000)],
      ),
    );
    if (!rows[0]) return json(res, 404, { error: "Post não encontrado" });
    return json(res, 200, { media: mapMedia(rows[0] as Record<string, unknown>) });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao salvar" });
  }
}
