import bcrypt from "bcryptjs";
import { fail, ok, parseBody } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { mutate, newId } from "@/lib/db";
import { registerSchema } from "@/lib/schemas";
import type { User } from "@/lib/types";

export async function POST(req: Request) {
  const parsed = await parseBody(req, registerSchema);
  if ("error" in parsed) return parsed.error;
  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await mutate("users", (rows) => {
    if (rows.some((u) => u.email.toLowerCase() === email)) return null;
    const u: User = { id: newId("u"), name, email, passwordHash, role: "user", createdAt: new Date().toISOString() };
    rows.push(u);
    return u;
  });
  if (!user) return fail(409, "An account with this email already exists", { email: "Already registered" });

  await startSession(user);
  return ok({ ok: true });
}
