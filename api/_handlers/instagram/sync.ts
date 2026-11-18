import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { loadIgCredential, publishDue, refreshIfNeeded, syncInstagram } from "../../_lib/instagram.js";

/** POST instagram/sync → atualiza perfil, biblioteca, métricas e comentários. Publica vencidos. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  try {
    const publish = await publishDue(withAuth).catch((e) => ({ error: String(e) }));
    const result = await withAuth(async (db) => {
      const cred = await loadIgCredential(db);
      if (!cred) return null;
      const fresh = await refreshIfNeeded(db, cred).catch(() => cred);
      return syncInstagram(db, fresh);
    });
    if (!result) return json(res, 400, { error: "Conecte o Instagram primeiro" });
    return json(res, 200, { ...result, publish });
  } catch (error) {
    console.error("instagram sync:", error);
    return json(res, 502, { error: error instanceof Error ? error.message : "Falha ao sincronizar" });
  }
}
