import "server-only";
import { cookies } from "next/headers";
import { fileStore } from "./db";
import { toPublicUser } from "./services";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";
import type { PublicUser } from "./types";

/** Current user, re-read from the database so role changes apply at once. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = (await fileStore.read("users")).find((u) => u.id === session.sub);
  return user ? toPublicUser(user) : null;
}

export async function startSession(user: PublicUser) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, {
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
