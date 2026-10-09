import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parseCookie, stringifySetCookie } from "cookie";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "orcamentos_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 dias

export type SessionUser = {
  sub: string;
  username: string;
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
  return new SignJWT({ username: user.username })
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
    return { sub: payload.sub, username: payload.username };
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
