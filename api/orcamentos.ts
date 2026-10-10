import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json } from "./_lib/auth.js";

import bootstrap from "./_handlers/bootstrap.js";
import data from "./_handlers/data.js";
import profile from "./_handlers/profile.js";
import seed from "./_handlers/seed.js";
import forgotPassword from "./_handlers/auth/forgot-password.js";
import login from "./_handlers/auth/login.js";
import logout from "./_handlers/auth/logout.js";
import me from "./_handlers/auth/me.js";
import resetPassword from "./_handlers/auth/reset-password.js";
import clients from "./_handlers/clients/index.js";
import presets from "./_handlers/presets/index.js";
import proposals from "./_handlers/proposals/index.js";
import proposalComments from "./_handlers/proposals/comments.js";
import proposalSend from "./_handlers/proposals/send.js";
import proposalShare from "./_handlers/proposals/share.js";
import publicComments from "./_handlers/public/comments.js";
import publicDecision from "./_handlers/public/decision.js";
import publicProposal from "./_handlers/public/proposal.js";
import publicUnlock from "./_handlers/public/unlock.js";

type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => unknown | Promise<unknown>;

/** Handlers estáticos — dynamic import falha com frequência no runtime Vercel. */
const routes: Record<string, RouteHandler> = {
  bootstrap,
  data,
  profile,
  seed,
  "auth/forgot-password": forgotPassword,
  "auth/login": login,
  "auth/logout": logout,
  "auth/me": me,
  "auth/reset-password": resetPassword,
  clients,
  presets,
  proposals,
  "proposals/comments": proposalComments,
  "proposals/send": proposalSend,
  "proposals/share": proposalShare,
  "public/comments": publicComments,
  "public/decision": publicDecision,
  "public/proposal": publicProposal,
  "public/unlock": publicUnlock,
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

function asHandler(value: unknown): RouteHandler | null {
  if (typeof value === "function") return value as RouteHandler;
  if (
    value &&
    typeof value === "object" &&
    "default" in value &&
    typeof (value as { default: unknown }).default === "function"
  ) {
    return (value as { default: RouteHandler }).default;
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    const key = routeKey(req);
    const route = asHandler(routes[key]);
    if (!route) {
      return json(res, 404, { error: "Not found" });
    }
    return await route(req, res);
  } catch (error) {
    console.error("api/orcamentos:", error);
    if (!res.headersSent) {
      return json(res, 500, { error: "Erro interno" });
    }
  }
}
