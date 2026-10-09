import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readSession } from "../../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }
  const session = await readSession(req);
  if (!session) {
    return json(res, 401, { error: "Não autenticado" });
  }
  return json(res, 200, { user: { username: session.username } });
}
