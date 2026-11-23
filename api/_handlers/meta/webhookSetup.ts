import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { appSecretConfigured, verifyToken } from "../../_lib/metaWebhook.js";
import { resolvePublicBaseUrl } from "../../_lib/publicUrl.js";

/**
 * GET → o que colar no painel da Meta (URL de callback + verify token) e os últimos eventos recebidos.
 * Sessão do painel obrigatória: o verify token não é público.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  try {
    const base = resolvePublicBaseUrl(String(req.headers.host ?? ""));
    const url = base ? `${new URL(base).origin}/webhooks/meta` : null;
    const events = await withAuth(async (db) => {
      const { rows } = await db.query(
        `SELECT object, field, created_at FROM meta_webhook_events ORDER BY id DESC LIMIT 10`,
      );
      return rows.map((r) => ({
        object: String(r.object),
        field: String(r.field),
        at: new Date(r.created_at as string).toISOString(),
      }));
    });
    return json(res, 200, {
      url,
      verifyToken: verifyToken(),
      customToken: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()),
      appSecret: appSecretConfigured(),
      events,
    });
  } catch (error) {
    console.error("meta webhook setup:", error);
    return json(res, 500, { error: error instanceof Error ? error.message : "Falha ao carregar o webhook" });
  }
}
