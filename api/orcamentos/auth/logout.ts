import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearSessionCookie, json } from "../../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }
  clearSessionCookie(res);
  return json(res, 200, { ok: true });
}
