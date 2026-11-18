import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { pluggy, pluggyConfigured } from "../../_lib/pluggy.js";

const ITEM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST { itemId? } → connect token (vale 30 min) para abrir o widget Pluggy Connect.
 * Com itemId, o widget abre direto na reconexão daquele banco.
 * O clientSecret nunca sai do servidor; o navegador só recebe este token temporário.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSession(req, res);
  if (!session) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!pluggyConfigured()) {
    return json(res, 400, { error: "Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na Vercel" });
  }
  const b = readBody<{ itemId?: string }>(req) ?? {};
  const itemId = b.itemId ? String(b.itemId) : undefined;
  if (itemId && !ITEM_ID.test(itemId)) return json(res, 400, { error: "Item ID inválido" });
  try {
    const r = await pluggy<{ accessToken: string }>("/connect_token", {
      method: "POST",
      body: { ...(itemId ? { itemId } : {}), options: { clientUserId: session.username } },
    });
    return json(res, 200, { accessToken: r.accessToken });
  } catch (error) {
    console.error("pluggy connect token:", error);
    return json(res, 502, { error: error instanceof Error ? error.message : "Falha ao falar com a Pluggy" });
  }
}
