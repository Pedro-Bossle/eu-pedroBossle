/** Helpers mínimos de Cookie / Set-Cookie (evita o pacote `cookie` ESM no bundle Vercel). */

export function parseCookieHeader(
  header: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

type SetCookieOpts = {
  name: string;
  value: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
};

export function buildSetCookie(opts: SetCookieOpts): string {
  const parts = [
    `${opts.name}=${encodeURIComponent(opts.value)}`,
  ];
  if (opts.maxAge != null) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) {
    const s = opts.sameSite;
    parts.push(
      `SameSite=${s === "lax" ? "Lax" : s === "strict" ? "Strict" : "None"}`,
    );
  }
  return parts.join("; ");
}
