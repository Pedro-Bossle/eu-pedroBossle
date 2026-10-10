import { randomBytes } from "crypto";
import { appPathPrefix, resolvePublicBaseUrl } from "./publicUrl.js";

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

export function publicProposalUrl(
  token: string,
  reqHost?: string,
): string | null {
  const base = resolvePublicBaseUrl(reqHost);
  if (!base) return null;
  return `${base}${appPathPrefix(base)}/p/${token}`;
}
