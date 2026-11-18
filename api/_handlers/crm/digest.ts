import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { loadToday } from "../../_lib/crmToday.js";
import { sendDigest } from "../../_lib/digestEmail.js";

/** POST crm/digest → manda o resumo do dia agora (teste), mesmo sem pendências. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const result = await sendDigest(await loadToday(), { force: true, host: String(req.headers.host ?? "") });
    return json(res, 200, result);
  } catch (error) {
    return json(res, 502, { error: error instanceof Error ? error.message : "Falha ao enviar o resumo" });
  }
}
