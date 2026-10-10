import { randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSharePassword(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export function generateShareToken(): string {
  return randomBytes(18).toString("base64url");
}

export function publicProposalUrl(token: string, reqHost?: string): string {
  const envBase = process.env.ORCAMENTOS_PUBLIC_URL?.replace(/\/$/, "");
  if (envBase) return `${envBase}/p/${token}`;

  if (reqHost) {
    const host = reqHost.split(":")[0]?.toLowerCase() ?? "";
    if (host === "orcamentos.devbossle.com.br" || host.startsWith("orcamentos.")) {
      return `https://${reqHost.replace(/\/$/, "")}/p/${token}`;
    }
    const proto =
      process.env.VERCEL === "1" || process.env.NODE_ENV === "production"
        ? "https"
        : "http";
    return `${proto}://${reqHost}/orcamentos/p/${token}`;
  }

  return `/orcamentos/p/${token}`;
}
