import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapProspect } from "../../_lib/prospects.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST { id, message } — Pedro aprova o texto do follow-up de um lead já enviado. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const body = readBody<{ id?: string; message?: string }>(req);
    const id = String(body?.id ?? "").trim();
    const message = String(body?.message ?? "").trim().slice(0, 1000);
    if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
    if (!message) return json(res, 400, { error: "Escreva o follow-up" });

    const lead = await withAuth(async (db) => {
      const { rows } = await db.query(
        `UPDATE prospect_leads
         SET followup_message = $2, followup_approved_at = now(), updated_at = now()
         WHERE id = $1 AND stage = 'enviado'
         RETURNING *`,
        [id, message],
      );
      if (!rows[0]) return null;
      await db.query(
        `INSERT INTO prospect_events (lead_id, from_stage, to_stage, actor, note)
         VALUES ($1, 'enviado', 'enviado', 'pedro', 'follow-up aprovado')`,
        [id],
      );
      return mapProspect(rows[0] as Record<string, unknown>);
    });
    if (!lead) return json(res, 409, { error: "Só leads em Mensagem enviada recebem follow-up" });
    return json(res, 200, { lead });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao aprovar o follow-up" });
  }
}
