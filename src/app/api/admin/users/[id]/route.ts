import { z } from "zod";
import { adminOrError, fail, ok, parseBody } from "@/lib/api";
import { mutate } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (id === auth.user.id) return fail(400, "You can't change your own role");
  const parsed = await parseBody(req, z.object({ role: z.enum(["user", "admin"]) }));
  if ("error" in parsed) return parsed.error;

  const found = await mutate("users", (rows) => {
    const u = rows.find((r) => r.id === id);
    if (!u) return false;
    u.role = parsed.data.role;
    return true;
  });
  return found ? ok({ ok: true }) : fail(404, "User not found");
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (id === auth.user.id) return fail(400, "You can't delete yourself");
  const removed = await mutate("users", (rows) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return false;
    rows.splice(i, 1);
    return true;
  });
  if (!removed) return fail(404, "User not found");
  await mutate("attempts", (rows) => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].userId === id) rows.splice(i, 1);
  });
  return ok({ ok: true });
}
