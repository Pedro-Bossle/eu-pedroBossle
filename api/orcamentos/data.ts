import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession, json } from "../_lib/auth.js";
import { withAuth } from "../_lib/db.js";
import { mapClient, mapProfile, mapProposal } from "../_lib/mappers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!(await requireSession(req, res))) return;

  try {
    const payload = await withAuth(async (client) => {
      const clients = (
        await client.query("SELECT * FROM clients ORDER BY name ASC")
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
      return { clients, proposals, profile };
    });
    return json(res, 200, payload);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao carregar dados" });
  }
}
