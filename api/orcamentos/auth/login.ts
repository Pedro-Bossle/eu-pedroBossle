import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { withDb } from "../../_lib/db.js";
import {
  json,
  readBody,
  setSessionCookie,
  signSession,
} from "../../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const body = readBody<{ username?: string; password?: string }>(req);
  if (!body) {
    return json(res, 400, { error: "JSON inválido" });
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username || !password) {
    return json(res, 400, { error: "Informe usuário e senha" });
  }

  try {
    const user = await withDb(async (client) => {
      const { rows } = await client.query(
        "SELECT id, username, password_hash FROM get_user_auth($1)",
        [username],
      );
      return rows[0] as
        | { id: string; username: string; password_hash: string }
        | undefined;
    });

    if (!user) {
      return json(res, 401, { error: "Usuário ou senha inválidos" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return json(res, 401, { error: "Usuário ou senha inválidos" });
    }

    const token = await signSession({
      sub: user.id,
      username: user.username,
    });
    setSessionCookie(res, token);
    return json(res, 200, { user: { username: user.username } });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao autenticar" });
  }
}
