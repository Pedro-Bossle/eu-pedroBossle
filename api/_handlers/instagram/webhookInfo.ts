import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { appSecret, verifyToken } from "../../_lib/metaWebhook.js";
import { resolvePublicBaseUrl } from "../../_lib/publicUrl.js";

/**
 * GET instagram/webhook → dados para colar no Meta for Developers (passo "Configure webhooks")
 * + os últimos eventos recebidos.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const base = resolvePublicBaseUrl(String(req.headers.host ?? ""));
  const callbackUrl = base ? `${new URL(base).origin}/webhooks/meta` : null;

  let token: string | null;
  try {
    token = verifyToken();
  } catch {
    token = null;
  }

  const events = await withAuth(async (db) => {
    const { rows } = await db.query(
      `SELECT id, object, field, entry_id, error, received_at FROM meta_webhook_events ORDER BY id DESC LIMIT 20`,
    );
    return rows.map((r) => ({
      id: String(r.id),
      object: String(r.object),
      field: String(r.field),
      entryId: String(r.entry_id),
      error: String(r.error ?? ""),
      receivedAt: new Date(r.received_at).toISOString(),
    }));
  }).catch(() => null); // tabela ainda não criada (rode npm run db:migrate)

  return json(res, 200, {
    callbackUrl,
    verifyToken: token,
    appSecretConfigured: Boolean(appSecret()),
    tableReady: events !== null,
    events: events ?? [],
  });
}
