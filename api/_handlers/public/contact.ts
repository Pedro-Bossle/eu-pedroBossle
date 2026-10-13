import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody } from "../../_lib/auth.js";
import {
  buildContactAutoReplyHtml,
  buildContactNotifyHtml,
} from "../../_lib/contactEmailHtml.js";
import { withDb } from "../../_lib/db.js";
import { clientIp, rateLimit } from "../../_lib/rateLimit.js";
import { getResend, getResendFrom } from "../../_lib/resend.js";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const body = readBody<{
    name?: string;
    email?: string;
    idea?: string;
    style?: string;
    styleId?: string;
    website?: string;
  }>(req);
  if (!body) return json(res, 400, { error: "JSON inválido" });

  // Honeypot: bots preenchem; humanos deixam vazio
  if (String(body.website ?? "").trim()) {
    return json(res, 200, { ok: true });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const idea = String(body.idea ?? "").trim();
  const style = String(body.style ?? "").trim().slice(0, 80);
  const styleId = String(body.styleId ?? "").trim().slice(0, 80);

  if (name.length < 2 || name.length > 120) {
    return json(res, 400, { error: "Informe um nome válido" });
  }
  if (!isEmail(email) || email.length > 200) {
    return json(res, 400, { error: "Informe um e-mail válido" });
  }
  if (idea.length < 8 || idea.length > 4000) {
    return json(res, 400, { error: "Descreva sua ideia com um pouco mais de detalhe" });
  }

  const ip = clientIp(req);
  const byIp = rateLimit(`contact:ip:${ip}`, 3, 60 * 60 * 1000);
  if (!byIp.ok) {
    return json(res, 429, {
      error: `Muitas tentativas. Tente novamente em ${byIp.retryAfterSec}s`,
    });
  }
  const byEmail = rateLimit(`contact:email:${email}`, 2, 60 * 60 * 1000);
  if (!byEmail.ok) {
    return json(res, 429, {
      error: `Muitas tentativas. Tente novamente em ${byEmail.retryAfterSec}s`,
    });
  }

  try {
    const leadId = await withDb(async (db) => {
      const { rows } = await db.query(
        "SELECT public_insert_contact_lead($1,$2,$3,$4,$5,$6) AS id",
        [name, email, idea, style, styleId, ip],
      );
      return rows[0]?.id as string | undefined;
    });

    if (!leadId) {
      return json(res, 500, { error: "Falha ao registrar contato" });
    }

    // E-mail é best-effort: o lead já está no banco
    try {
      const notifyTo =
        process.env.CONTACT_NOTIFY_EMAIL?.trim().toLowerCase() ||
        "pedro.bossle.s@gmail.com";

      const from = getResendFrom();
      const resend = getResend();

      const notify = await resend.emails.send({
        from,
        to: [notifyTo],
        replyTo: email,
        subject: `Novo contato · ${name}${style ? ` · ${style}` : ""}`,
        html: buildContactNotifyHtml({
          name,
          email,
          idea,
          style,
          styleId,
        }),
      });

      if (notify.error) {
        console.error("contact notify:", notify.error);
      }

      const reply = await resend.emails.send({
        from,
        to: [email],
        subject: `Recebi sua mensagem${style ? ` · ${style}` : ""} · Pedro Bossle`,
        html: buildContactAutoReplyHtml({ name, style, styleId }),
      });

      if (reply.error) {
        console.error("contact auto-reply:", reply.error);
      }
    } catch (mailError) {
      console.error("contact email skipped:", mailError);
    }

    return json(res, 200, { ok: true, id: leadId });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao enviar mensagem" });
  }
}
