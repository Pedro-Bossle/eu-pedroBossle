import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapProspect } from "../../_lib/prospects.js";
import { botActorFor, isStage, moveLead, requireBot, type Stage } from "../../_lib/prospectFunnel.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Chaves com funil ou mensagens. POST { id, to, note?, replyText? } → move de etapa
 * seguindo as setas permitidas (ver BOT_TRANSITIONS): funil usa as do Dev Bossle,
 * mensagens as do WhatsApp.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const bot = await requireBot(req, res, ["funil", "mensagens"]);
  if (!bot) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const body = readBody<{ id?: string; to?: string; note?: string; replyText?: string }>(req);
    const id = String(body?.id ?? "").trim();
    if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
    if (!isStage(body?.to)) return json(res, 400, { error: "Etapa inválida" });

    const to = body!.to as Stage;
    const out = await withAuth(async (db) => {
      const { rows } = await db.query(`SELECT stage FROM prospect_leads WHERE id = $1`, [id]);
      const from = rows[0]?.stage as Stage | undefined;
      if (!from) return { ok: false as const, status: 404, error: "Lead não encontrado" };
      const actor = botActorFor(bot, from, to);
      if (!actor) {
        return { ok: false as const, status: 409, error: `Esta chave não pode mover ${from} → ${to}` };
      }
      return moveLead(db, { id, to, actor, note: body?.note, replyText: body?.replyText });
    });
    if (!out.ok) return json(res, out.status, { error: out.error });
    return json(res, 200, { lead: mapProspect(out.row) });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao mover o lead" });
  }
}
