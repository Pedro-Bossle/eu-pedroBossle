import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import {
  json,
  readBody,
  setProposalSessionCookie,
  signProposalSession,
} from "../../_lib/auth.js";
import { withDb } from "../../_lib/db.js";
import { clientIp, rateLimit } from "../../_lib/rateLimit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const body = readBody<{ token?: string; password?: string }>(req);
  if (!body) return json(res, 400, { error: "JSON inválido" });

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");
  if (!token || !password) {
    return json(res, 400, { error: "Informe o token e a senha" });
  }

  const ip = clientIp(req);
  const limited = rateLimit(`unlock:${ip}:${token}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return json(res, 429, {
      error: `Muitas tentativas. Tente novamente em ${limited.retryAfterSec}s`,
    });
  }

  try {
    const row = await withDb(async (db) => {
      const { rows } = await db.query(
        `SELECT proposal_id, share_password_hash, share_enabled
         FROM public_get_share_auth($1)`,
        [token],
      );
      return rows[0] as
        | {
            proposal_id: string;
            share_password_hash: string;
            share_enabled: boolean;
          }
        | undefined;
    });

    if (!row?.share_enabled || !row.share_password_hash) {
      return json(res, 404, { error: "Link inválido ou desativado" });
    }

    const ok = await bcrypt.compare(password, row.share_password_hash);
    if (!ok) {
      return json(res, 401, { error: "Senha incorreta" });
    }

    const jwt = await signProposalSession({
      proposalId: row.proposal_id,
      token,
    });
    setProposalSessionCookie(res, jwt);
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao desbloquear proposta" });
  }
}
