import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { withDb } from "../_lib/db.js";
import { json } from "../_lib/auth.js";

/**
 * Cria o usuário admin a partir de ORCAMENTOS_USERNAME / ORCAMENTOS_PASSWORD
 * se a tabela app_users estiver vazia. Protegido por ORCAMENTOS_BOOTSTRAP_SECRET.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const secret = process.env.ORCAMENTOS_BOOTSTRAP_SECRET;
  const provided = String(req.headers["x-bootstrap-secret"] ?? "");
  if (!secret || provided !== secret) {
    return json(res, 403, { error: "Bootstrap não autorizado" });
  }

  const username = process.env.ORCAMENTOS_USERNAME?.trim();
  const password = process.env.ORCAMENTOS_PASSWORD;
  if (!username || !password || password.length < 8) {
    return json(res, 400, {
      error: "Configure ORCAMENTOS_USERNAME e ORCAMENTOS_PASSWORD (≥ 8)",
    });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const status = await withDb(async (client) => {
      const { rows } = await client.query(
        "SELECT bootstrap_admin($1, $2)",
        [username, hash],
      );
      const row = rows[0] as { bootstrap_admin?: string } | undefined;
      return row?.bootstrap_admin ?? "exists";
    });

    return json(res, status === "created" ? 201 : 200, {
      ok: true,
      created: status === "created",
      username,
    });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha no bootstrap" });
  }
}
