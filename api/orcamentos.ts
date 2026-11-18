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
 * sem colocar a subrota na query (barra em ?path= quebrava subrotas com barra).
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
  // Funil (009)
  "prospects/stage": () => import("./_handlers/prospects/stage.js"),
  "prospects/followup": () => import("./_handlers/prospects/followup.js"),
  "prospects/bot-tokens": () => import("./_handlers/prospects/botTokens.js"),
  // Rotas dos bots (Authorization: Bearer dbb_…)
  "bot/leads": () => import("./_handlers/bot/leads.js"),
  "bot/queue": () => import("./_handlers/bot/queue.js"),
  "bot/move": () => import("./_handlers/bot/move.js"),
  // Instagram (011)
  instagram: () => import("./_handlers/instagram/index.js"),
  "instagram/oauth": () => import("./_handlers/instagram/oauth.js"),
  "instagram/oauth-callback": () => import("./_handlers/instagram/oauthCallback.js"),
  "instagram/sync": () => import("./_handlers/instagram/sync.js"),
  "instagram/posts": () => import("./_handlers/instagram/posts.js"),
  "instagram/media": () => import("./_handlers/instagram/media.js"),
  "instagram/comments": () => import("./_handlers/instagram/comments.js"),
  "instagram/upload": () => import("./_handlers/instagram/upload.js"),
  // Finanças (012)
  finance: () => import("./_handlers/finance/index.js"),
  "finance/sync": () => import("./_handlers/finance/sync.js"),
  "finance/analytics": () => import("./_handlers/finance/analytics.js"),
  "finance/connect-token": () => import("./_handlers/finance/connectToken.js"),
  // Webhook público da Pluggy (header secreto) + registro pelo painel
  "finance/webhook": () => import("./_handlers/finance/webhook.js"),
  "finance/webhook-setup": () => import("./_handlers/finance/webhookSetup.js"),
  "finance/transactions": () => import("./_handlers/finance/transactions.js"),
  "finance/rules": () => import("./_handlers/finance/rules.js"),
  // CRM (013)
  "crm/today": () => import("./_handlers/crm/today.js"),
  "crm/tasks": () => import("./_handlers/crm/tasks.js"),
  "crm/activities": () => import("./_handlers/crm/activities.js"),
  "crm/search": () => import("./_handlers/crm/search.js"),
  // Vercel Cron / GitHub Actions (Bearer CRON_SECRET)
  cron: () => import("./_handlers/cron.js"),
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
    // Endereço curto do webhook da Pluggy (rewrite em vercel.json)
    if (/^\/webhooks\/pluggy\/?$/.test(pathOnly)) return "finance/webhook";
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
