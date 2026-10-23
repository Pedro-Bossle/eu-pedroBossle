import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

/**
 * Criptografia de segredos guardados no Neon (ex.: chave do Gemini).
 * AES-256-GCM. A chave vem de ORCAMENTOS_SECRETS_KEY ou, na falta dela,
 * é derivada de ORCAMENTOS_SESSION_SECRET. Trocar qualquer uma das duas
 * invalida os segredos salvos (basta salvar a chave de novo no painel).
 */
function key(): Buffer {
  const base =
    process.env.ORCAMENTOS_SECRETS_KEY ||
    process.env.ORCAMENTOS_SESSION_SECRET ||
    "";
  if (base.length < 16) {
    throw new Error(
      "Defina ORCAMENTOS_SECRETS_KEY (ou ORCAMENTOS_SESSION_SECRET) com pelo menos 16 caracteres",
    );
  }
  return createHash("sha256").update(`devbossle-secrets:${base}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

/** Retorna null quando o valor não pode ser lido (chave do servidor mudou ou dado corrompido). */
export function decryptSecret(payload: string): string | null {
  try {
    const [version, ivB64, tagB64, encB64] = payload.split(".");
    if (version !== "v1" || !ivB64 || !tagB64 || !encB64) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(encB64, "base64")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
