import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { requireSession, json } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapProposal } from "../../_lib/mappers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const proposals = await withAuth(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM proposals ORDER BY created_at DESC",
        );
        return rows.map(mapProposal);
      });
      return json(res, 200, { proposals });
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const id = String(body.id || randomUUID());
      const created = String(body.created || new Date().toISOString());

      const proposal = await withAuth(async (db) => {
        await db.query(
          `INSERT INTO proposals (
             id, client_id, company, validity, version, idea, scope, timeline,
             total, manual_total, payment, needs, notes, status, items, links,
             created_at, updated_at
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,
             $17::timestamptz, now()
           )
           ON CONFLICT (id) DO UPDATE SET
             client_id = EXCLUDED.client_id,
             company = EXCLUDED.company,
             validity = EXCLUDED.validity,
             version = EXCLUDED.version,
             idea = EXCLUDED.idea,
             scope = EXCLUDED.scope,
             timeline = EXCLUDED.timeline,
             total = EXCLUDED.total,
             manual_total = EXCLUDED.manual_total,
             payment = EXCLUDED.payment,
             needs = EXCLUDED.needs,
             notes = EXCLUDED.notes,
             status = EXCLUDED.status,
             items = EXCLUDED.items,
             links = EXCLUDED.links,
             updated_at = now()`,
          [
            id,
            body.clientId || null,
            String(body.company ?? ""),
            Number(body.validity ?? 7),
            String(body.version ?? "1"),
            String(body.idea ?? ""),
            String(body.scope ?? ""),
            String(body.timeline ?? ""),
            Number(body.total ?? 0),
            Boolean(body.manualTotal),
            String(body.payment ?? ""),
            String(body.needs ?? ""),
            String(body.notes ?? ""),
            String(body.status ?? "Em elaboração"),
            JSON.stringify(body.items ?? []),
            JSON.stringify(body.links ?? []),
            created,
          ],
        );
        const { rows } = await db.query(
          "SELECT * FROM proposals WHERE id = $1",
          [id],
        );
        return mapProposal(rows[0]);
      });
      return json(res, 200, { proposal });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "");
      if (!id) return json(res, 400, { error: "id obrigatório" });
      await withAuth(async (db) => {
        await db.query("DELETE FROM proposals WHERE id = $1", [id]);
      });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha em propostas" });
  }
}
