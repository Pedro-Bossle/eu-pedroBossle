import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { requireSession, json } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapClient } from "../../_lib/mappers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const clients = await withAuth(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM clients ORDER BY name ASC",
        );
        return rows.map(mapClient);
      });
      return json(res, 200, { clients });
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const id = String(body.id || randomUUID());
      const name = String(body.name ?? "").trim();
      if (!name) return json(res, 400, { error: "Nome obrigatório" });

      const clientRow = await withAuth(async (db) => {
        await db.query(
          `INSERT INTO clients (id, name, company, phone, email, link, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             company = EXCLUDED.company,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             link = EXCLUDED.link,
             notes = EXCLUDED.notes,
             updated_at = now()`,
          [
            id,
            name,
            String(body.company ?? ""),
            String(body.phone ?? ""),
            String(body.email ?? ""),
            String(body.link ?? ""),
            String(body.notes ?? ""),
          ],
        );
        const { rows } = await db.query("SELECT * FROM clients WHERE id = $1", [
          id,
        ]);
        return mapClient(rows[0]);
      });
      return json(res, 200, { client: clientRow });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "");
      if (!id) return json(res, 400, { error: "id obrigatório" });
      await withAuth(async (db) => {
        await db.query("DELETE FROM clients WHERE id = $1", [id]);
      });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha em clientes" });
  }
}
