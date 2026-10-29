import type { VercelRequest, VercelResponse } from "@vercel/node";

type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => unknown | Promise<unknown>;

/**
 * Rotas não-auth (auth tem entrypoints próprios leves).
 * Lazy-load evita derrubar a function no cold start.
 *
 * O rewrite em vercel.json manda /api/orcamentos/* → /api/orcamentos
 * sem colocar a subrota na query (barra em ?path= quebrava prospects/settings).
 * O path real continua em req.url.
 */
const loaders: Record<string, () => Promise<{ default: RouteHandler }>> = {
  bootstrap: () => import("./_handlers/bootstrap.js"),
  data: () => import("./_handlers/data.js"),
  profile: () => import("./_handlers/profile.js"),
  seed: () => import("./_handlers/seed.js"),
  clients: () => import("./_handlers/clients/index.js"),
  presets: () => import("./_handlers/presets/index.js"),
  proposals: () => import("./_handlers/proposals/index.js"),
  "proposals/comments": () => import("./_handlers/proposals/comments.js"),
  "proposals/send": () => import("./_handlers/proposals/send.js"),
  "proposals/share": () => import("./_handlers/proposals/share.js"),
  "public/comments": () => import("./_handlers/public/comments.js"),
  "public/contact": () => import("./_handlers/public/contact.js"),
  "public/decision": () => import("./_handlers/public/decision.js"),
  "public/proposal": () => import("./_handlers/public/proposal.js"),
  "public/unlock": () => import("./_handlers/public/unlock.js"),
  leads: () => import("./_handlers/leads.js"),
  prospects: () => import("./_handlers/prospects/index.js"),
  // Fallbacks se o rewrite dedicado falhar (Hobby / edge cases)
  "prospects/settings": () => import("./_handlers/prospects/settings.js"),
  "prospects/search": () => import("./_handlers/prospects/search.js"),
  // Funil (009)
  "prospects/stage": () => import("./_handlers/prospects/stage.js"),
  "prospects/followup": () => import("./_handlers/prospects/followup.js"),
  "prospects/bot-tokens": () => import("./_handlers/prospects/botTokens.js"),
  // Rotas dos bots (Authorization: Bearer dbb_…)
  "bot/leads": () => import("./_handlers/bot/leads.js"),
  "bot/queue": () => import("./_handlers/bot/queue.js"),
  "bot/move": () => import("./_handlers/bot/move.js"),
};

function routeKey(req: VercelRequest): string {
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
    const marker = "/api/orcamentos/";
    const idx = pathOnly.indexOf(marker);
    if (idx >= 0) {
      return pathOnly.slice(idx + marker.length).replace(/^\/+|\/+$/g, "");
    }
  }

  // Compat com deploys antigos que ainda mandavam ?path=
  const q = req.query.path;
  if (Array.isArray(q)) {
    const joined = q.filter(Boolean).join("/");
    if (joined) return joined.replace(/^\/+|\/+$/g, "");
  } else if (typeof q === "string" && q.length > 0) {
    return decodeURIComponent(q).replace(/^\/+|\/+$/g, "");
  }

  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    const key = routeKey(req);
    const loader = loaders[key];
    if (!loader) {
      res.status(404).json({ error: "Not found", path: key || null });
      return;
    }

    const mod = await loader();
    const route = mod.default;
    if (typeof route !== "function") {
      res.status(500).json({ error: "Handler inválido" });
      return;
    }
    return await route(req, res);
  } catch (error) {
    console.error("api/orcamentos:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro interno" });
    }
  }
}
