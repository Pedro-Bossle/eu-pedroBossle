import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT, jwtVerify } from "jose";
import { json, readSession, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { IG_SCOPES, connectIg } from "../../_lib/instagram.js";
import { appPathPrefix, resolvePublicBaseUrl } from "../../_lib/publicUrl.js";

function stateKey() {
  return new TextEncoder().encode(`ig-oauth:${process.env.ORCAMENTOS_SESSION_SECRET ?? ""}`);
}

function redirectUri(req: VercelRequest): string | null {
  const env = process.env.META_REDIRECT_URI?.trim();
  if (env) return env;
  const base = resolvePublicBaseUrl(String(req.headers.host ?? ""));
  if (!base) return null;
  return `${new URL(base).origin}/api/orcamentos/instagram/oauth-callback`;
}

/** ID da configuração do Facebook Login for Business (Meta → Instagram API → passo 1). */
function unifiedConfigId(): string {
  const v = process.env.META_LOGIN_CONFIG_ID?.trim() ?? "";
  return /^\d{5,30}$/.test(v) ? v : "";
}

const graphVersion = () => process.env.META_GRAPH_VERSION?.trim() || "v24.0";

/** Unified login: troca o code por um token de usuário do sistema em graph.facebook.com. */
async function exchangeUnifiedCode(code: string, uri: string): Promise<string> {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/oauth/access_token`);
  url.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  url.searchParams.set("client_secret", process.env.META_APP_SECRET ?? "");
  url.searchParams.set("redirect_uri", uri);
  url.searchParams.set("code", code);
  const r = await fetch(url);
  const data = (await r.json().catch(() => ({}))) as { access_token?: string; error?: { message?: string } };
  if (!r.ok || !data.access_token) throw new Error(data.error?.message ?? `Facebook ${r.status}`);
  return data.access_token;
}

function panelUrl(req: VercelRequest, qs: string) {
  const base = resolvePublicBaseUrl(String(req.headers.host ?? "")) ?? "";
  return `${base}${base ? appPathPrefix(base) : "/orcamentos"}?tab=instagram&${qs}`;
}

/** GET instagram/oauth → { url } para abrir o login do Instagram. */
export async function start(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  const appId = process.env.META_APP_ID;
  const uri = redirectUri(req);
  if (!appId || !process.env.META_APP_SECRET) {
    return json(res, 400, { error: "Defina META_APP_ID e META_APP_SECRET na Vercel" });
  }
  if (!uri) return json(res, 400, { error: "Defina ORCAMENTOS_PUBLIC_URL ou META_REDIRECT_URI" });
  const state = await new SignJWT({ p: "ig" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(stateKey());
  const configId = unifiedConfigId();
  if (configId) {
    // Unified login (apps novos): Facebook Login for Business com a configuração do app
    const url = new URL(`https://www.facebook.com/${graphVersion()}/dialog/oauth`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", uri);
    url.searchParams.set("config_id", configId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("override_default_response_type", "true");
    url.searchParams.set("state", state);
    return json(res, 200, { url: url.toString(), redirectUri: uri });
  }
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", uri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", IG_SCOPES.join(","));
  url.searchParams.set("state", state);
  return json(res, 200, { url: url.toString(), redirectUri: uri });
}

/** GET instagram/oauth-callback?code&state → troca o code pelo token e volta ao painel. */
export async function callback(req: VercelRequest, res: VercelResponse) {
  const back = (qs: string) => {
    res.statusCode = 302;
    res.setHeader("Location", panelUrl(req, qs));
    res.end();
  };
  try {
    if (!(await readSession(req))) return back("ig=erro&msg=" + encodeURIComponent("Faça login no painel antes"));
    const code = String(req.query.code ?? "").replace(/#_$/, "");
    const state = String(req.query.state ?? "");
    if (req.query.error) return back("ig=erro&msg=" + encodeURIComponent(String(req.query.error_description ?? req.query.error)));
    await jwtVerify(state, stateKey());
    const uri = redirectUri(req);
    if (!code || !uri) return back("ig=erro&msg=" + encodeURIComponent("Resposta do Instagram incompleta"));

    if (unifiedConfigId()) {
      const token = await exchangeUnifiedCode(code, uri);
      await withAuth((db) => connectIg(db, token));
      return back("ig=ok");
    }

    const r = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.META_APP_ID ?? "",
        client_secret: process.env.META_APP_SECRET ?? "",
        grant_type: "authorization_code",
        redirect_uri: uri,
        code,
      }),
    });
    const data = (await r.json().catch(() => ({}))) as { access_token?: string; error_message?: string };
    if (!r.ok || !data.access_token) {
      return back("ig=erro&msg=" + encodeURIComponent(data.error_message ?? `Instagram ${r.status}`));
    }
    await withAuth((db) => connectIg(db, data.access_token!));
    return back("ig=ok");
  } catch (e) {
    console.error("instagram oauth:", e);
    return back("ig=erro&msg=" + encodeURIComponent(e instanceof Error ? e.message : "Falha no login"));
  }
}

export default start;
