import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapProspect } from "../../_lib/prospects.js";
import { isStage, moveLead, requireBot } from "../../_lib/prospectFunnel.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Os dois bots. POST { id, to, note?, replyText? } → move de etapa seguindo as setas
 * permitidas para o papel do bot (ver BOT_TRANSITIONS).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const bot = await requireBot(req, res, ["prospector", "executor"]);
  if (!bot) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  try {
    const body = readBody<{ id?: string; to?: string; note?: string; replyText?: string }>(req);
    const id = String(body?.id ?? "").trim();
    if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
    if (!isStage(body?.to)) return json(res, 400, { error: "Etapa inválida" });

    const out = await withAuth((db) =>
      moveLead(db, {
        id,
        to: body!.to as Parameters<typeof moveLead>[1]["to"],
        actor: bot.role,
        note: body?.note,
        replyText: body?.replyText,
      }),
    );
    if (!out.ok) return json(res, out.status, { error: out.error });
    return json(res, 200, { lead: mapProspect(out.row) });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao mover o lead" });
  }
}
