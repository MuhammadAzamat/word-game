import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";
import type { PublicUser, User } from "./types";

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

/** Current user, re-read from the database so role changes apply at once. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await getUser(session.sub);
  return user ? toPublicUser(user) : null;
}

export async function startSession(user: User) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function requireUser(next = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}

/** For API routes: returns the user or null without redirecting. */
export async function apiUser() {
  return getCurrentUser();
}
