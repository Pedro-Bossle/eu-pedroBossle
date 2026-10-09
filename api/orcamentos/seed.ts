import type { VercelRequest, VercelResponse } from "@vercel/node";
import seed from "../../src/data/orcamentos-seed.json" with { type: "json" };
import type { OrcamentoSeed } from "../../src/types/orcamentos.js";
import { requireSession, json } from "../_lib/auth.js";
import { withAuth } from "../_lib/db.js";
import { mapClient, mapProfile, mapProposal } from "../_lib/mappers.js";

const data = seed as OrcamentoSeed;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!(await requireSession(req, res))) return;

  const mode = String(req.body?.mode ?? "merge"); // merge | replace

  try {
    const result = await withAuth(async (client) => {
      let clientsUpserted = 0;
      let proposalsUpserted = 0;

      if (mode === "replace") {
        await client.query("DELETE FROM proposals");
        await client.query("DELETE FROM clients");
      }

      for (const c of data.clients) {
        await client.query(
          `INSERT INTO clients (id, name, company, phone, email, link, notes, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7, now())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             company = EXCLUDED.company,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             link = EXCLUDED.link,
             notes = EXCLUDED.notes,
             updated_at = now()`,
          [c.id, c.name, c.company, c.phone, c.email, c.link, c.notes],
        );
        clientsUpserted += 1;
      }

      for (const p of data.proposals) {
        await client.query(
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
            p.id,
            p.clientId || null,
            p.company,
            p.validity,
            p.version,
            p.idea,
            p.scope,
            p.timeline,
            p.total,
            p.manualTotal,
            p.payment,
            p.needs,
            p.notes,
            p.status,
            JSON.stringify(p.items ?? []),
            JSON.stringify(p.links ?? []),
            p.created || new Date().toISOString(),
          ],
        );
        proposalsUpserted += 1;
      }

      if (data.profile) {
        await client.query(
          `UPDATE profile SET
             name = $1, title = $2, phone = $3, email = $4,
             linkedin = $5, portfolio = $6, bio = $7, updated_at = now()
           WHERE id = 1`,
          [
            data.profile.name,
            data.profile.title,
            data.profile.phone,
            data.profile.email,
            data.profile.linkedin,
            data.profile.portfolio,
            data.profile.bio,
          ],
        );
      }

      const clients = (
        await client.query("SELECT * FROM clients ORDER BY name")
      ).rows.map(mapClient);
      const proposals = (
        await client.query(
          "SELECT * FROM proposals ORDER BY created_at DESC",
        )
      ).rows.map(mapProposal);
      const profile = mapProfile(
        (await client.query("SELECT * FROM profile WHERE id = 1")).rows[0] ??
          {},
      );

      return { clientsUpserted, proposalsUpserted, clients, proposals, profile };
    });

    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao importar seed" });
  }
}
