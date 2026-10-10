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

/**
 * Um único Serverless Function (Hobby ≤ 12).
 * Catch-all [...path] NÃO funciona fora do Next.js — use rewrite em vercel.json
 * de /api/orcamentos/:path* → /api/orcamentos e despache pelo req.url.
 */
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
  const url = req.url ?? "";
  const pathOnly = (url.split("?")[0] ?? "").replace(/\/+$/, "");
  const prefix = "/api/orcamentos/";
  const idx = pathOnly.indexOf(prefix);
  if (idx >= 0) {
    return pathOnly.slice(idx + prefix.length);
  }
  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = routeKey(req);
  const route = routes[key];
  if (!route) {
    return json(res, 404, { error: "Not found" });
  }
  return route(req, res);
}
