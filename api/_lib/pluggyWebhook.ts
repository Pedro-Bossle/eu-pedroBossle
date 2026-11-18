import { createHash, timingSafeEqual } from "node:crypto";

/** Header que a Pluggy reenvia em cada chamada do webhook (configurado ao registrar). */
export const WEBHOOK_HEADER = "x-webhook-secret";

/**
 * Segredo do webhook: PLUGGY_WEBHOOK_SECRET, ou derivado do ORCAMENTOS_SESSION_SECRET
 * (funciona sem configurar nada a mais; trocar o segredo da sessão invalida o webhook).
 */
export function webhookSecret(): string {
  const explicit = process.env.PLUGGY_WEBHOOK_SECRET?.trim();
  if (explicit && explicit.length >= 16) return explicit;
  const base = process.env.ORCAMENTOS_SESSION_SECRET ?? "";
  if (base.length < 16) throw new Error("Defina PLUGGY_WEBHOOK_SECRET (16+ caracteres)");
  return createHash("sha256").update(`pluggy-webhook:${base}`).digest("hex").slice(0, 48);
}

export function validWebhookSecret(got: unknown): boolean {
  if (typeof got !== "string" || !got) return false;
  const expected = webhookSecret();
  return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}
