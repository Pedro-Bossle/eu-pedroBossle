import type { VercelRequest, VercelResponse } from "@vercel/node";

type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => unknown | Promise<unknown>;

/**
 * Rotas não-auth (auth tem entrypoints próprios leves).
 * Lazy-load evita derrubar a function no cold start.
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
  "public/decision": () => import("./_handlers/public/decision.js"),
  "public/proposal": () => import("./_handlers/public/proposal.js"),
  "public/unlock": () => import("./_handlers/public/unlock.js"),
};

function routeKey(req: VercelRequest): string {
  const q = req.query.path;
  if (Array.isArray(q)) {
    const joined = q.filter(Boolean).join("/");
    if (joined) return joined.replace(/^\/+|\/+$/g, "");
  } else if (typeof q === "string" && q.length > 0) {
    return q.replace(/^\/+|\/+$/g, "");
  }

  const url = req.url ?? "";
  const pathOnly = (url.split("?")[0] ?? "").replace(/\/+$/, "");
  const marker = "/api/orcamentos/";
  const idx = pathOnly.indexOf(marker);
  if (idx >= 0) return pathOnly.slice(idx + marker.length);
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
      res.status(404).json({ error: "Not found" });
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
