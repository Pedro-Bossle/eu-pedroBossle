import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Criptografia simétrica (AES-256-GCM) para tokens de integrações guardados no banco.
 * Chave: INTEGRATIONS_ENC_KEY (recomendado) ou, na falta, derivada do ORCAMENTOS_SESSION_SECRET.
 * Formato: v1.<iv>.<tag>.<ciphertext> (base64url).
 */
function key(): Buffer {
  const raw = process.env.INTEGRATIONS_ENC_KEY || process.env.ORCAMENTOS_SESSION_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("Defina INTEGRATIONS_ENC_KEY (ou ORCAMENTOS_SESSION_SECRET) com 16+ caracteres");
  }
  return createHash("sha256").update(`integrations:${raw}`).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function open(sealed: string): string {
  const [v, iv, tag, enc] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !enc) throw new Error("Segredo em formato inválido");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(enc, "base64url")), decipher.final()]).toString("utf8");
}
