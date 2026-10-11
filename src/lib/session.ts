import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./types";

// Edge-safe session helpers (used by middleware and server code alike).

export const SESSION_COOKIE = "wg_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export interface SessionPayload {
  sub: string;
  role: Role;
  name: string;
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set in production");
  }
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me-please-0123456789");
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return { sub: payload.sub, role: payload.role as Role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
