import bcrypt from "bcryptjs";
import { fail, ok, parseBody } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { getUserByEmail } from "@/lib/db";
import { loginSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const parsed = await parseBody(req, loginSchema);
  if ("error" in parsed) return parsed.error;
  const user = await getUserByEmail(parsed.data.email);
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return fail(401, "Wrong email or password");
  }
  await startSession(user);
  return ok({ ok: true, role: user.role });
}
