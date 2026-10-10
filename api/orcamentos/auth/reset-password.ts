import { createHash } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { json, readBody } from "../../_lib/auth.js";
import { withDb } from "../../_lib/db.js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const body = readBody<{ token?: string; password?: string }>(req);
  if (!body) {
    return json(res, 400, { error: "JSON inválido" });
  }

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");
  if (!token) {
    return json(res, 400, { error: "Link inválido ou incompleto" });
  }
  if (password.length < 8) {
    return json(res, 400, { error: "A senha deve ter pelo menos 8 caracteres" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await withDb(async (db) => {
      const { rows } = await db.query(
        "SELECT consume_password_reset_token($1, $2) AS status",
        [hashToken(token), passwordHash],
      );
      return String(rows[0]?.status ?? "invalid");
    });

    if (result === "ok") {
      return json(res, 200, { ok: true });
    }
    if (result === "expired") {
      return json(res, 400, {
        error: "Este link expirou. Solicite uma nova redefinição.",
      });
    }
    if (result === "used") {
      return json(res, 400, {
        error: "Este link já foi usado. Solicite uma nova redefinição.",
      });
    }
    return json(res, 400, {
      error: "Link inválido. Solicite uma nova redefinição.",
    });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao redefinir senha" });
  }
}
