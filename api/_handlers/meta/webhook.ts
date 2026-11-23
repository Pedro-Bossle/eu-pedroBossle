import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
import { json } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { loadIgCredential, refreshCommentsFromWebhook } from "../../_lib/instagram.js";
import {
  KEEP_EVENTS,
  SIGNATURE_HEADER,
  flattenEvents,
  readRawBody,
  validSignature,
  validVerifyToken,
  type MetaPayload,
} from "../../_lib/metaWebhook.js";

/** Campos do Instagram que trazem comentário novo → puxa os comentários de novo. */
const COMMENT_FIELDS = new Set(["comments", "live_comments", "mentions"]);

function one(v: unknown): string {
  return String(Array.isArray(v) ? v[0] : (v ?? ""));
}

/**
 * Webhook da Meta (público): https://orcamentos.devbossle.com.br/webhooks/meta
 *
 * GET  → verificação da URL: devolve hub.challenge se hub.verify_token for o do painel.
 * POST → eventos assinados (X-Hub-Signature-256 com o META_APP_SECRET; inválido = 401).
 *        Responde 200 na hora e trabalha depois (waitUntil): a Meta reenvia se demorar.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const q = req.query;
    const mode = one(q["hub.mode"]);
    const challenge = one(q["hub.challenge"]);
    if (mode === "subscribe" && challenge && validVerifyToken(one(q["hub.verify_token"]))) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.status(200).send(challenge.slice(0, 200));
      return;
    }
    return json(res, 403, { error: "Token de verificação inválido" });
  }

  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

  let raw: Buffer;
  try {
    raw = await readRawBody(req);
  } catch {
    return json(res, 413, { error: "Corpo inválido" });
  }
  if (!validSignature(raw, req.headers[SIGNATURE_HEADER])) {
    console.warn("meta webhook: assinatura inválida", process.env.META_APP_SECRET ? "" : "(META_APP_SECRET ausente)");
    return json(res, 401, { error: "Assinatura inválida" });
  }

  let payload: MetaPayload;
  try {
    payload = JSON.parse(raw.toString("utf8")) as MetaPayload;
  } catch {
    return json(res, 200, { ok: true, ignored: true });
  }
  const events = flattenEvents(payload);
  console.log("meta webhook:", payload.object ?? "-", events.map((e) => e.field || "?").join(",") || "vazio");

  const work = async () => {
    // 1) Guarda os eventos (só os KEEP_EVENTS mais recentes)
    const ids = await withAuth(async (db) => {
      const out: string[] = [];
      for (const e of events) {
        const { rows } = await db.query(
          `INSERT INTO meta_webhook_events (object, field, entry_id, payload) VALUES ($1, $2, $3, $4) RETURNING id`,
          [e.object.slice(0, 60), e.field.slice(0, 60), e.entryId.slice(0, 60), JSON.stringify(e.payload)],
        );
        out.push(String(rows[0]?.id));
      }
      await db.query(
        `DELETE FROM meta_webhook_events
          WHERE id < (SELECT min(id) FROM (SELECT id FROM meta_webhook_events ORDER BY id DESC LIMIT $1) k)`,
        [KEEP_EVENTS],
      );
      return out;
    });

    // 2) Comentário ou menção do Instagram → puxa os comentários de novo
    if (payload.object !== "instagram") return;
    const hits = events.filter((e) => COMMENT_FIELDS.has(e.field));
    if (!hits.length) return;

    const mediaIds = new Set<string>();
    let unknownMedia = false;
    for (const h of hits) {
      const v = (h.payload as { value?: { media?: { id?: string }; media_id?: string } }).value;
      const id = String(v?.media?.id ?? (h.field === "mentions" ? "" : (v?.media_id ?? "")));
      if (id) mediaIds.add(id);
      else unknownMedia = true;
    }

    try {
      await withAuth(async (db) => {
        const cred = await loadIgCredential(db);
        if (!cred) return;
        if (unknownMedia || mediaIds.size === 0) {
          await refreshCommentsFromWebhook(db, cred);
          return;
        }
        for (const id of [...mediaIds].slice(0, 5)) await refreshCommentsFromWebhook(db, cred, id);
      });
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      await withAuth((db) =>
        db.query(`UPDATE meta_webhook_events SET error = $2 WHERE id = ANY($1::bigint[])`, [ids, msg]),
      ).catch(() => undefined);
      throw e;
    }
  };

  waitUntil(
    work().catch((e) => {
      console.error("meta webhook:", e);
    }),
  );
  return json(res, 200, { ok: true });
}
