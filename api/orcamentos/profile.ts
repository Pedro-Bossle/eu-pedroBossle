import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession, json } from "../_lib/auth.js";
import { withAuth } from "../_lib/db.js";
import { mapProfile } from "../_lib/mappers.js";
import { maskCpfCnpj } from "../../src/lib/documentMask.js";
import { maskPhoneBr } from "../../src/lib/phoneMask.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const profile = await withAuth(async (client) => {
        const { rows } = await client.query(
          "SELECT * FROM profile WHERE id = 1",
        );
        return mapProfile(rows[0] ?? {});
      });
      return json(res, 200, { profile });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = req.body ?? {};
      const profile = await withAuth(async (client) => {
        await client.query(
          `UPDATE profile SET
             name = $1, title = $2, phone = $3, email = $4,
             linkedin = $5, portfolio = $6, bio = $7,
             document = $8, address = $9, updated_at = now()
           WHERE id = 1`,
          [
            String(body.name ?? ""),
            String(body.title ?? ""),
            body.phone ? maskPhoneBr(String(body.phone)) : "",
            String(body.email ?? ""),
            String(body.linkedin ?? ""),
            String(body.portfolio ?? ""),
            String(body.bio ?? ""),
            body.document ? maskCpfCnpj(String(body.document)) : "",
            String(body.address ?? ""),
          ],
        );
        const { rows } = await client.query(
          "SELECT * FROM profile WHERE id = 1",
        );
        return mapProfile(rows[0]);
      });
      return json(res, 200, { profile });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha no perfil" });
  }
}
