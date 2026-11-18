import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { json, readBody } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { pluggyConfigured, syncAllItems } from "../../_lib/pluggy.js";
import { WEBHOOK_HEADER, validWebhookSecret } from "../../_lib/pluggyWebhook.js";

const ITEM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Payload = {
  event?: string;
  eventId?: string;
  itemId?: string;
  accountId?: string;
  transactionIds?: string[];
  error?: { code?: string; message?: string } | null;
};

/** Eventos que trazem dados novos: sincroniza o item. */
const SYNC_EVENTS = new Set([
  "item/created",
  "item/updated",
  "item/login_succeeded",
  "transactions/created",
  "transactions/updated",
]);

/**
 * Webhook da Pluggy (público, autenticado pelo header secreto).
 * Responde 200 na hora e faz o trabalho depois (waitUntil): a Pluggy espera resposta rápida
 * e reenvia se demorar.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!validWebhookSecret(req.headers[WEBHOOK_HEADER])) return json(res, 401, { error: "Não autorizado" });

  const body = readBody<Payload>(req);
  const event = String(body?.event ?? "");
  const itemId = String(body?.itemId ?? "");
  if (!event || !ITEM_ID.test(itemId)) return json(res, 200, { ok: true, ignored: true });

  const work = async () => {
    // Só mexe em conexões deste painel (item/created de um widget daqui entra automaticamente)
    const known = await withAuth(async (db) => {
      const { rows } = await db.query(`SELECT 1 FROM fin_items WHERE id = $1`, [itemId]);
      if (!rows[0] && event === "item/created") {
        await db.query(`INSERT INTO fin_items (id) VALUES ($1) ON CONFLICT DO NOTHING`, [itemId]);
        return true;
      }
      return Boolean(rows[0]);
    });
    if (!known) return;

    if (event === "item/error" || event === "item/waiting_user_input" || event === "connector/status_updated") {
      const msg =
        event === "item/waiting_user_input"
          ? "O banco pediu uma confirmação: use Reconectar"
          : body?.error?.message || body?.error?.code || "Erro na conexão com o banco";
      await withAuth((db) =>
        db.query(`UPDATE fin_items SET error = $2, status = $3 WHERE id = $1`, [
          itemId,
          msg.slice(0, 500),
          event === "item/waiting_user_input" ? "WAITING_USER_INPUT" : "LOGIN_ERROR",
        ]),
      );
      return;
    }

    if (event === "item/deleted") {
      await withAuth((db) =>
        db.query(`UPDATE fin_items SET status = 'DELETED', error = 'Conexão removida na Pluggy' WHERE id = $1`, [itemId]),
      );
      return;
    }

    if (event === "transactions/deleted" && Array.isArray(body?.transactionIds) && body.transactionIds.length) {
      await withAuth((db) =>
        db.query(`DELETE FROM fin_transactions WHERE id = ANY($1)`, [body!.transactionIds!.map(String).slice(0, 5000)]),
      );
      return;
    }

    if (SYNC_EVENTS.has(event) && pluggyConfigured()) {
      await syncAllItems(withAuth, { onlyId: itemId });
    }
  };

  waitUntil(
    work().catch((e) => {
      console.error("pluggy webhook:", event, itemId, e);
    }),
  );
  return json(res, 200, { ok: true });
}
