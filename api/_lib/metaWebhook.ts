import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { VercelRequest } from "@vercel/node";

const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Verify token do webhook da Meta: META_WEBHOOK_VERIFY_TOKEN, ou derivado do
 * ORCAMENTOS_SESSION_SECRET (funciona sem configurar nada a mais; trocar o segredo da sessão
 * muda o token e a Meta precisa ser atualizada).
 */
export function verifyToken(): string {
  const explicit = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (explicit && explicit.length >= 8) return explicit;
  const base = process.env.ORCAMENTOS_SESSION_SECRET ?? "";
  if (base.length < 16) throw new Error("Defina META_WEBHOOK_VERIFY_TOKEN (8+ caracteres)");
  return createHash("sha256").update(`meta-webhook-verify:${base}`).digest("hex").slice(0, 32);
}

export function validVerifyToken(got: unknown): boolean {
  return typeof got === "string" && got.length > 0 && same(got, verifyToken());
}

export const appSecretConfigured = () => Boolean(process.env.META_APP_SECRET?.trim());

/** Lê o corpo cru (a assinatura da Meta é calculada sobre os bytes exatos). */
export async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk as Uint8Array));
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw) return raw;
  // Ambientes que já consumiram o stream (ex.: dev local): melhor esforço
  const body = req.body as unknown;
  if (typeof body === "string") return body;
  return body && typeof body === "object" ? JSON.stringify(body) : "";
}

/** Confere o header `X-Hub-Signature-256: sha256=…` com o App Secret. */
export function validSignature(raw: string, header: unknown): boolean {
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret || typeof header !== "string") return false;
  const expected = `sha256=${createHmac("sha256", secret).update(raw, "utf8").digest("hex")}`;
  return same(header, expected);
}
