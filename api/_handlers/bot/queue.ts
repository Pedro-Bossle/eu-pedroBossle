import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { DAILY_FIRST_CONTACTS, inSendWindow, requireBot } from "../../_lib/prospectFunnel.js";

/**
 * Bot Whatsapp (executor). GET → o que pode ser enviado agora.
 * Só devolve leads Aprovados por Pedro e follow-ups que ele aprovou,
 * respeitando a janela de envio e o limite diário.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireBot(req, res, ["executor"]))) return;
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  try {
    if (!inSendWindow()) {
      return json(res, 200, {
        window: false,
        info: "Fora da janela de envio (seg–sex, 9h–11h30 e 14h–17h30)",
        send: [],
        followups: [],
      });
    }

    const data = await withAuth(async (db) => {
      const sentToday = await db.query(
        `SELECT count(*)::int AS n FROM prospect_events
         WHERE to_stage = 'enviado' AND actor = 'bot:whatsapp'
           AND created_at >= date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'`,
      );
      const remaining = Math.max(0, DAILY_FIRST_CONTACTS - Number(sentToday.rows[0]?.n ?? 0));

      const send = remaining
        ? (
            await db.query(
              `SELECT id, name, whatsapp, message FROM prospect_leads
               WHERE stage = 'aprovado' ORDER BY stage_changed_at LIMIT $1`,
              [remaining],
            )
          ).rows
        : [];
      const followups = (
        await db.query(
          `SELECT id, name, whatsapp, followup_message AS message FROM prospect_leads
           WHERE stage = 'enviado' AND followup_approved_at IS NOT NULL
           ORDER BY followup_approved_at LIMIT 20`,
        )
      ).rows;
      return { remaining, send, followups };
    });

    return json(res, 200, { window: true, ...data });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao montar a fila" });
  }
}
