import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { loadToday } from "../../_lib/crmToday.js";

/** GET crm/today → resumo do dia (ver api/_lib/crmToday.ts). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  return json(res, 200, await loadToday());
}
