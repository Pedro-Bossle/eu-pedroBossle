import { timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json } from "../_lib/auth.js";
import { withAuth } from "../_lib/db.js";
import { loadIgCredential, publishDue, refreshIfNeeded, syncInstagram } from "../_lib/instagram.js";
import { pluggyConfigured, syncAllItems } from "../_lib/pluggy.js";

/**
 * Tarefas automáticas. Autoriza com `Authorization: Bearer $CRON_SECRET`
 * (a Vercel Cron manda esse header sozinha quando CRON_SECRET existe).
 *
 * ?tasks=publish → só publica posts vencidos (rodar a cada 5–10 min)
 * ?tasks=daily   → publica + renova token + sincroniza Instagram e finanças
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET ?? "";
  const got = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const ok =
    secret.length >= 16 &&
    got.length === secret.length &&
    timingSafeEqual(Buffer.from(got), Buffer.from(secret));
  if (!ok) return json(res, 401, { error: "Não autorizado" });

  const tasks = String(req.query.tasks ?? "daily");
  const out: Record<string, unknown> = {};

  try {
    out.publish = await publishDue(withAuth);
  } catch (e) {
    out.publish = { error: e instanceof Error ? e.message : String(e) };
  }

  if (tasks === "daily") {
    try {
      out.instagram = await withAuth(async (db) => {
        const cred = await loadIgCredential(db);
        if (!cred) return { skipped: "não conectado" };
        const fresh = await refreshIfNeeded(db, cred);
        return syncInstagram(db, fresh, { pages: 2 });
      });
    } catch (e) {
      out.instagram = { error: e instanceof Error ? e.message : String(e) };
    }
    if (pluggyConfigured()) {
      try {
        out.finance = await syncAllItems(withAuth);
      } catch (e) {
        out.finance = { error: e instanceof Error ? e.message : String(e) };
      }
    }
  }

  return json(res, 200, { ok: true, tasks, ...out });
}
