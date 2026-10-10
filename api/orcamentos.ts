import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json } from "./_lib/auth.js";

type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => unknown | Promise<unknown>;

type RouteModule = { default: RouteHandler };

/**
 * Lazy-load: evita que import JSON / handlers pesados derrubem login/me no cold start.
 * Catch-all [...path] não funciona fora do Next — rewrite em vercel.json aponta para cá.
 */
const loaders: Record<string, () => Promise<RouteModule>> = {
  bootstrap: () => import("./_handlers/bootstrap.js"),
  data: () => import("./_handlers/data.js"),
  profile: () => import("./_handlers/profile.js"),
  seed: () => import("./_handlers/seed.js"),
  "auth/forgot-password": () => import("./_handlers/auth/forgot-password.js"),
  "auth/login": () => import("./_handlers/auth/login.js"),
  "auth/logout": () => import("./_handlers/auth/logout.js"),
  "auth/me": () => import("./_handlers/auth/me.js"),
  "auth/reset-password": () => import("./_handlers/auth/reset-password.js"),
  clients: () => import("./_handlers/clients/index.js"),
  presets: () => import("./_handlers/presets/index.js"),
  proposals: () => import("./_handlers/proposals/index.js"),
  "proposals/comments": () => import("./_handlers/proposals/comments.js"),
  "proposals/send": () => import("./_handlers/proposals/send.js"),
  "proposals/share": () => import("./_handlers/proposals/share.js"),
  "public/comments": () => import("./_handlers/public/comments.js"),
  "public/decision": () => import("./_handlers/public/decision.js"),
  "public/proposal": () => import("./_handlers/public/proposal.js"),
  "public/unlock": () => import("./_handlers/public/unlock.js"),
};

function routeKey(req: VercelRequest): string {
  // Preferido: rewrite vercel.json → /api/orcamentos?path=:path*
  const q = req.query.path;
  if (Array.isArray(q)) {
    const joined = q.filter(Boolean).join("/");
    if (joined) return joined.replace(/^\/+|\/+$/g, "");
  } else if (typeof q === "string" && q.length > 0) {
    return q.replace(/^\/+|\/+$/g, "");
  }

  const candidates = [
    req.url,
    typeof req.headers["x-forwarded-uri"] === "string"
      ? req.headers["x-forwarded-uri"]
      : "",
    typeof req.headers["x-invoke-path"] === "string"
      ? req.headers["x-invoke-path"]
      : "",
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const pathOnly = String(raw).split("?")[0] ?? "";
    const normalized = pathOnly.replace(/\/+$/, "");
    const marker = "/api/orcamentos/";
    const idx = normalized.indexOf(marker);
    if (idx >= 0) {
      return normalized.slice(idx + marker.length);
    }
  }

  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const key = routeKey(req);
    const loader = loaders[key];
    if (!loader) {
      return json(res, 404, { error: "Not found", path: key || null });
    }
    const mod = await loader();
    const route = mod.default;
    if (typeof route !== "function") {
      console.error("Handler inválido para", key, mod);
      return json(res, 500, { error: "Handler inválido" });
    }
    return await route(req, res);
  } catch (error) {
    console.error("api/orcamentos router:", error);
    if (!res.headersSent) {
      return json(res, 500, { error: "Erro interno" });
    }
  }
}
