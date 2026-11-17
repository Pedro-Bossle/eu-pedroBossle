import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { pluggyConfigured, syncAllItems } from "../../_lib/pluggy.js";

/** POST { itemId?, refresh?, full? } → puxa contas/transações/investimentos da Pluggy. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!pluggyConfigured()) return json(res, 400, { error: "Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na Vercel" });
  const b = readBody<{ itemId?: string; refresh?: boolean; full?: boolean }>(req) ?? {};
  try {
    const results = await syncAllItems(withAuth, {
      onlyId: b.itemId ? String(b.itemId) : undefined,
      refresh: Boolean(b.refresh),
      full: Boolean(b.full),
    });
    return json(res, 200, { results });
  } catch (error) {
    console.error("finance sync:", error);
    return json(res, 502, { error: error instanceof Error ? error.message : "Falha ao sincronizar" });
  }
}
