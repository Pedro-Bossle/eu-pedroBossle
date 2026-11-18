import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { ACTIVITY_KINDS, UUID, mapActivity } from "../../_lib/crm.js";

/**
 * Histórico do cliente.
 * GET ?clientId → interações (mais recentes primeiro)
 * POST { clientId, kind, body, at? } → registra (atualiza o updated_at do cliente)
 * DELETE ?id → apaga
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  try {
    if (req.method === "GET") {
      const clientId = String(req.query.clientId ?? "");
      if (!clientId) return json(res, 400, { error: "clientId obrigatório" });
      const { rows } = await withAuth((db) =>
        db.query(`SELECT * FROM crm_activities WHERE client_id = $1 ORDER BY at DESC LIMIT 300`, [clientId]),
      );
      return json(res, 200, { activities: rows.map(mapActivity) });
    }

    if (req.method === "POST") {
      const b = readBody<{ clientId?: string; kind?: string; body?: string; at?: string }>(req);
      const clientId = String(b?.clientId ?? "");
      const text = String(b?.body ?? "").trim().slice(0, 4000);
      if (!clientId || !text) return json(res, 400, { error: "Escreva o que aconteceu" });
      const kind = (ACTIVITY_KINDS as readonly string[]).includes(String(b?.kind)) ? String(b?.kind) : "nota";
      const at = b?.at ? new Date(b.at) : new Date();
      if (Number.isNaN(at.getTime())) return json(res, 400, { error: "Data inválida" });
      const { rows } = await withAuth(async (db) => {
        await db.query(`UPDATE clients SET updated_at = now() WHERE id = $1`, [clientId]);
        return db.query(`INSERT INTO crm_activities (client_id, kind, body, at) VALUES ($1,$2,$3,$4) RETURNING *`, [
          clientId,
          kind,
          text,
          at,
        ]);
      });
      return json(res, 201, { activity: mapActivity(rows[0]!) });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "");
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      await withAuth((db) => db.query(`DELETE FROM crm_activities WHERE id = $1`, [id]));
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("crm activities:", error);
    return json(res, 500, { error: "Falha no histórico" });
  }
}
