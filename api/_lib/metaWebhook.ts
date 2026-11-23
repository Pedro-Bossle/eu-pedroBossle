import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { VercelRequest } from "@vercel/node";

/** Header da assinatura que a Meta manda em cada POST do webhook. */
export const SIGNATURE_HEADER = "x-hub-signature-256";

/** Quantos eventos ficam guardados em meta_webhook_events. */
export const KEEP_EVENTS = 200;

/**
 * Token de verificação (GET da Meta ao salvar a URL de callback):
 * META_WEBHOOK_VERIFY_TOKEN, ou derivado do ORCAMENTOS_SESSION_SECRET
 * (funciona sem configurar nada a mais; trocar o segredo da sessão muda o token).
 */
export function verifyToken(): string {
  const explicit = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (explicit && explicit.length >= 16) return explicit;
  const base = process.env.ORCAMENTOS_SESSION_SECRET ?? "";
  if (base.length < 16) throw new Error("Defina META_WEBHOOK_VERIFY_TOKEN (16+ caracteres)");
  return createHash("sha256").update(`meta-webhook:${base}`).digest("hex").slice(0, 40);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function validVerifyToken(got: unknown): boolean {
  if (typeof got !== "string" || !got) return false;
  try {
    return safeEqual(got, verifyToken());
  } catch {
    return false;
  }
}

export function appSecret(): string {
  return process.env.META_APP_SECRET?.trim() ?? "";
}

/** Confere "sha256=<hex>" contra o HMAC-SHA256 do corpo bruto com o META_APP_SECRET. */
export function validSignature(raw: Buffer, header: unknown): boolean {
  const secret = appSecret();
  if (!secret || typeof header !== "string") return false;
  const m = /^sha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!m) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  return safeEqual(m[1]!.toLowerCase(), expected);
}

/**
 * Corpo bruto da requisição. O runtime da Vercel já leu o stream para montar req.body,
 * mas reenvia os mesmos bytes nos eventos "data"/"end" — a assinatura precisa deles intactos
 * (JSON.stringify do corpo já parseado não bate com o que a Meta assinou).
 */
export function readRawBody(req: VercelRequest, limit = 1_000_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer | string) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      size += buf.length;
      if (size > limit) {
        reject(new Error("Corpo grande demais"));
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export type MetaChange = { field?: string; value?: Record<string, unknown> };
export type MetaEntry = {
  id?: string;
  time?: number;
  changes?: MetaChange[];
  messaging?: Record<string, unknown>[];
};
export type MetaPayload = { object?: string; entry?: MetaEntry[] };

/** Um registro por mudança (ou por bloco de mensagens) para gravar na tabela. */
export function flattenEvents(p: MetaPayload): { object: string; field: string; entryId: string; payload: unknown }[] {
  const object = String(p.object ?? "");
  const out: { object: string; field: string; entryId: string; payload: unknown }[] = [];
  for (const e of p.entry ?? []) {
    const entryId = String(e.id ?? "");
    for (const c of e.changes ?? []) {
      out.push({ object, field: String(c.field ?? ""), entryId, payload: { time: e.time ?? null, ...c } });
    }
    if (e.messaging?.length) {
      out.push({ object, field: "messages", entryId, payload: { time: e.time ?? null, messaging: e.messaging } });
    }
    if (!e.changes?.length && !e.messaging?.length) {
      out.push({ object, field: "", entryId, payload: e });
    }
  }
  return out;
}
