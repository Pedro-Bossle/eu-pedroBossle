import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { withDb } from "../../_lib/db.js";
import {
  json,
  readBody,
  setSessionCookie,
  signSession,
} from "../../_lib/auth.js";
import { clientIp, rateLimit } from "../../_lib/rateLimit.js";

type AuthRow = {
  id: string;
  username: string;
  password_hash: string;
  session_version?: number;
};

async function fetchUser(username: string): Promise<AuthRow | undefined> {
  try {
    return await withDb(async (client) => {
      const { rows } = await client.query(
        "SELECT id, username, password_hash, session_version FROM get_user_auth($1)",
        [username],
      );
      return rows[0] as AuthRow | undefined;
    });
  } catch {
    return withDb(async (client) => {
      const { rows } = await client.query(
        "SELECT id, username, password_hash FROM get_user_auth($1)",
        [username],
      );
      return rows[0] as AuthRow | undefined;
    });
  }
}

function tooManyAttempts(req: VercelRequest, res: VercelResponse) {
  const ip = clientIp(req);
  const limited = rateLimit(`login-fail:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    json(res, 429, {
      error: `Muitas tentativas. Tente novamente em ${limited.retryAfterSec}s`,
    });
    return true;
  }
  return false;
}

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
    const user = await fetchUser(username);
    if (!user) {
      if (tooManyAttempts(req, res)) return;
      return json(res, 401, { error: "Usuário ou senha inválidos" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      if (tooManyAttempts(req, res)) return;
      return json(res, 401, { error: "Usuário ou senha inválidos" });
    }

    const token = await signSession({
      sub: user.id,
      username: user.username,
      sv: Number(user.session_version ?? 0),
    });
    setSessionCookie(req, res, token);
    return json(res, 200, { user: { username: user.username } });
  } catch (error) {
    console.error("login:", error);
    const msg = error instanceof Error ? error.message : "";
    return json(res, 500, {
      error: msg.includes("ORCAMENTOS_SESSION_SECRET")
        ? "Configuração de sessão ausente no servidor"
        : msg.includes("DATABASE_URL")
          ? "Banco de dados não configurado"
          : "Falha ao autenticar",
    });
  }
}
