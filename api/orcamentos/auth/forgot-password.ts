import { createHash, randomBytes } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody } from "../../_lib/auth.js";
import { withDb } from "../../_lib/db.js";
import {
  buildPasswordResetEmailHtml,
  passwordResetUrl,
} from "../../_lib/passwordResetEmailHtml.js";
import { getResend, getResendFrom } from "../../_lib/resend.js";

const EXPIRES_MINUTES = 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Sempre responde 200 genérico (anti-enumeration).
 * Envia o link para o e-mail cadastrado em Meus dados (profile).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  // Aceita body vazio / inválido sem falhar
  readBody(req);

  const generic = () =>
    json(res, 200, {
      ok: true,
      message:
        "Se houver uma conta com e-mail em Meus dados, enviamos o link de redefinição.",
    });

  try {
    const target = await withDb(async (db) => {
      const { rows } = await db.query(
        "SELECT user_id, username, email, name FROM get_password_reset_target()",
      );
      return rows[0] as
        | { user_id: string; username: string; email: string; name: string }
        | undefined;
    });

    const email = String(target?.email ?? "").trim().toLowerCase();
    if (!target?.user_id || !email || !isEmail(email)) {
      return generic();
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000);

    await withDb(async (db) => {
      await db.query(
        "SELECT create_password_reset_token($1::uuid, $2, $3::timestamptz)",
        [target.user_id, tokenHash, expiresAt.toISOString()],
      );
    });

    const host = String(req.headers.host ?? "");
    const resetUrl = passwordResetUrl(token, host);
    const html = buildPasswordResetEmailHtml({
      name: target.name || target.username,
      resetUrl,
      expiresMinutes: EXPIRES_MINUTES,
    });

    const { error } = await getResend().emails.send({
      from: getResendFrom(),
      to: [email],
      subject: "Redefinir senha · Orçamentos · .dev Bossle",
      html,
    });

    if (error) {
      console.error(error);
      // Ainda genérico para o cliente
      return generic();
    }

    return generic();
  } catch (error) {
    console.error(error);
    return generic();
  }
}
