import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapProspect } from "../../_lib/prospects.js";
import { isStage, moveLead } from "../../_lib/prospectFunnel.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Painel (sessão do Pedro).
 * GET  ?id=…  → histórico do lead
 * PATCH { id, to, note?, result?, message? } → move de etapa (aprovar, recusar, proposta, fechado…)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const id = String(req.query.id ?? "").trim();
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      const events = await withAuth(async (db) => {
        const { rows } = await db.query(
          `SELECT from_stage, to_stage, actor, note, created_at
           FROM prospect_events WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 200`,
          [id],
        );
        return rows.map((r) => ({
          from: String(r.from_stage),
          to: String(r.to_stage),
          actor: String(r.actor),
          note: String(r.note),
          at: new Date(r.created_at as string).toISOString(),
        }));
      });
      return json(res, 200, { events });
    }

    if (req.method === "PATCH") {
      const body = readBody<{ id?: string; to?: string; note?: string; result?: string; message?: string }>(req);
      if (!body) return json(res, 400, { error: "JSON inválido" });
      const id = String(body.id ?? "").trim();
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      if (!isStage(body.to)) return json(res, 400, { error: "Etapa inválida" });

      const out = await withAuth((db) =>
        moveLead(db, {
          id,
          to: body.to as Parameters<typeof moveLead>[1]["to"],
          actor: "pedro",
          note: body.note,
          result: body.result,
          message: body.message,
        }),
      );
      if (!out.ok) return json(res, out.status, { error: out.error });
      return json(res, 200, { lead: mapProspect(out.row) });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao mover o lead" });
  }
}
