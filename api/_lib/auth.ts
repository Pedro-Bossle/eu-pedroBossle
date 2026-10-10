import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseCookie, stringifySetCookie } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import { withDb } from "./db.js";

const COOKIE = "orcamentos_session";
const PROPOSAL_COOKIE = "orcamentos_proposal_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 dias
const PROPOSAL_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export type SessionUser = {
  sub: string;
  username: string;
  /** Versão da sessão; muda ao redefinir senha e invalida JWTs antigos. */
  sv: number;
};

export type ProposalSession = {
  proposalId: string;
  token: string;
};

function secretKey() {
  const secret = process.env.ORCAMENTOS_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ORCAMENTOS_SESSION_SECRET deve ter pelo menos 16 caracteres",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ username: user.username, sv: user.sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export async function readSession(
  req: VercelRequest,
): Promise<SessionUser | null> {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const token = parseCookie(raw)[COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub || typeof payload.username !== "string") return null;
    if (typeof payload.sv !== "number" || !Number.isInteger(payload.sv)) {
      return null;
    }

    const current = await withDb(async (db) => {
      const { rows } = await db.query(
        "SELECT get_session_version($1::uuid) AS sv",
        [payload.sub],
      );
      return Number(rows[0]?.sv ?? -1);
    });

    if (current !== payload.sv) return null;

    return {
      sub: payload.sub,
      username: payload.username,
      sv: payload.sv,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(res: VercelResponse, token: string) {
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    stringifySetCookie({
      name: COOKIE,
      value: token,
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
    }),
  );
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader(
    "Set-Cookie",
    stringifySetCookie({
      name: COOKIE,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }),
  );
}

export function json(
  res: VercelResponse,
  status: number,
  body: unknown,
) {
  res.status(status).json(body);
}

/** Lê req.body sem derrubar o vercel dev quando o JSON é inválido. */
export function readBody<T extends Record<string, unknown> = Record<string, unknown>>(
  req: VercelRequest,
): T | null {
  try {
    const body = req.body;
    if (body == null) return {} as T;
    if (typeof body === "string") {
      const trimmed = body.trim();
      if (!trimmed) return {} as T;
      return JSON.parse(trimmed) as T;
    }
    return body as T;
  } catch {
    return null;
  }
}

export async function requireSession(
  req: VercelRequest,
  res: VercelResponse,
): Promise<SessionUser | null> {
  const session = await readSession(req);
  if (!session) {
    json(res, 401, { error: "Não autenticado" });
    return null;
  }
  return session;
}

export async function signProposalSession(session: ProposalSession) {
  return new SignJWT({ token: session.token })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.proposalId)
    .setIssuedAt()
    .setExpirationTime(`${PROPOSAL_MAX_AGE}s`)
    .sign(secretKey());
}

export async function readProposalSession(
  req: VercelRequest,
): Promise<ProposalSession | null> {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const jwt = parseCookie(raw)[PROPOSAL_COOKIE];
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, secretKey());
    if (!payload.sub || typeof payload.token !== "string") return null;
    return { proposalId: payload.sub, token: payload.token };
  } catch {
    return null;
  }
}

export function setProposalSessionCookie(res: VercelResponse, token: string) {
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    stringifySetCookie({
      name: PROPOSAL_COOKIE,
      value: token,
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: PROPOSAL_MAX_AGE,
    }),
  );
}

export async function requireProposalSession(
  req: VercelRequest,
  res: VercelResponse,
  shareToken: string,
): Promise<ProposalSession | null> {
  const session = await readProposalSession(req);
  if (!session || session.token !== shareToken) {
    json(res, 401, { error: "Desbloqueie a proposta com a senha" });
    return null;
  }
  return session;
}
