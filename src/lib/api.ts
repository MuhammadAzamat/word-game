import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getCurrentUser } from "./auth";

export const ok = <T,>(data: T, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (status: number, error: string, fields?: Record<string, string>) =>
  NextResponse.json({ error, fields }, { status });

/** Parses a JSON body with a zod schema, returning field errors on failure. */
export async function parseBody<T>(req: Request, schema: ZodType<T>) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: fail(400, "Invalid JSON body") } as const;
  }
  const res = schema.safeParse(raw);
  if (!res.success) {
    const fields: Record<string, string> = {};
    for (const issue of res.error.issues) {
      const k = issue.path.join(".");
      if (!fields[k]) fields[k] = issue.message;
    }
    return { error: fail(422, res.error.issues[0]?.message ?? "Invalid input", fields) } as const;
  }
  return { data: res.data } as const;
}

export async function adminOrError() {
  const user = await getCurrentUser();
  if (!user) return { error: fail(401, "Sign in required") } as const;
  if (user.role !== "admin") return { error: fail(403, "Admins only") } as const;
  return { user } as const;
}
