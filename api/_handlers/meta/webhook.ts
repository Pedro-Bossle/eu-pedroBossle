import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { json } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { loadIgCredential, refreshIfNeeded, syncInstagram } from "../../_lib/instagram.js";
import { appSecretConfigured, readRawBody, validSignature, validVerifyToken } from "../../_lib/metaWebhook.js";

type Change = { field?: string; value?: unknown };
type Entry = { id?: string; time?: number; changes?: Change[]; messaging?: unknown[] };
type Payload = { object?: string; entry?: Entry[] };

/** Campos do Instagram que mudam comentários/menções: vale puxar os comentários de novo. */
const COMMENT_FIELDS = new Set(["comments", "live_comments", "mentions"]);

const MAX_PAYLOAD = 20_000;
const KEEP_EVENTS = 200;

/** Lista cada evento do payload como { field, value }. */
function flatten(body: Payload): { field: string; value: unknown }[] {
  const out: { field: string; value: unknown }[] = [];
  for (const entry of body.entry ?? []) {
    for (const c of entry.changes ?? []) out.push({ field: String(c.field ?? ""), value: c.value ?? {} });
    for (const m of entry.messaging ?? []) out.push({ field: "messages", value: m });
  }
  return out;
}

async function handleEvents(body: Payload) {
  const events = flatten(body);
  if (!events.length) return;
  const object = String(body.object ?? "").slice(0, 40);

  await withAuth(async (db) => {
    for (const ev of events) {
      const text = JSON.stringify(ev.value);
      const payload = text.length > MAX_PAYLOAD ? { truncated: true } : ev.value;
      await db.query(`INSERT INTO meta_webhook_events (object, field, payload) VALUES ($1, $2, $3::jsonb)`, [
        object,
        ev.field.slice(0, 60),
        JSON.stringify(payload),
      ]);
    }
    await db.query(
      `DELETE FROM meta_webhook_events WHERE id NOT IN (SELECT id FROM meta_webhook_events ORDER BY id DESC LIMIT $1)`,
      [KEEP_EVENTS],
    );
  });

  if (object === "instagram" && events.some((e) => COMMENT_FIELDS.has(e.field))) {
    await withAuth(async (db) => {
      const cred = await loadIgCredential(db);
      if (!cred) return;
      const fresh = await refreshIfNeeded(db, cred).catch(() => cred);
      await syncInstagram(db, fresh, { pages: 1 });
    });
  }
}

/**
 * Webhook da Meta (público; a Meta não usa a sessão do painel).
 * GET  → verificação: devolve hub.challenge se hub.verify_token for o do painel.
 * POST → eventos, autenticados pela assinatura X-Hub-Signature-256 (META_APP_SECRET).
 *        Responde 200 na hora e trabalha depois (waitUntil), a Meta reenvia se demorar.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && typeof challenge === "string" && validVerifyToken(req.query["hub.verify_token"])) {
      res.status(200).setHeader("Content-Type", "text/plain; charset=utf-8").send(challenge);
      return;
    }
    return json(res, 403, { error: "Verify token inválido" });
  }

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  if (!appSecretConfigured()) {
    console.error("meta webhook: defina META_APP_SECRET para validar a assinatura");
    return json(res, 503, { error: "META_APP_SECRET não configurado" });
  }
  const raw = await readRawBody(req);
  if (!validSignature(raw, req.headers["x-hub-signature-256"])) {
    return json(res, 401, { error: "Assinatura inválida" });
  }

  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return json(res, 400, { error: "JSON inválido" });
  }

  console.log("meta webhook:", body.object ?? "-", "entradas:", body.entry?.length ?? 0);
  waitUntil(handleEvents(body).catch((e) => console.error("meta webhook:", e)));
  return json(res, 200, { ok: true });
}
