/**
 * Base URL pública para links em e-mail / share.
 * Nunca confia em Host arbitrário (evita password-reset / open-redirect poisoning).
 */
const ALLOWED_HOSTS = new Set([
  "orcamentos.devbossle.com.br",
  "localhost",
  "127.0.0.1",
]);

export function resolvePublicBaseUrl(reqHost?: string): string | null {
  const envBase = process.env.ORCAMENTOS_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (envBase) return envBase;

  if (!reqHost) return null;
  const hostOnly = (reqHost.split(":")[0] ?? "").toLowerCase();
  if (!ALLOWED_HOSTS.has(hostOnly)) return null;

  if (hostOnly === "localhost" || hostOnly === "127.0.0.1") {
    const portPart = reqHost.includes(":") ? `:${reqHost.split(":")[1]}` : "";
    return `http://${hostOnly}${portPart}`;
  }

  return `https://${hostOnly}`;
}

/** Path prefix quando a app roda sob /orcamentos (dev local / host principal). */
export function appPathPrefix(baseUrl: string): string {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    if (host === "orcamentos.devbossle.com.br") return "";
  } catch {
    /* ignore */
  }
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) {
    return "/orcamentos";
  }
  // ORCAMENTOS_PUBLIC_URL custom: se terminar com /orcamentos, não duplicar
  if (baseUrl.endsWith("/orcamentos")) return "";
  return "/orcamentos";
}
