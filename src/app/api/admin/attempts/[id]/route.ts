import { adminOrError, fail, ok } from "@/lib/api";
import { mutate } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const removed = await mutate("attempts", (rows) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return false;
    rows.splice(i, 1);
    return true;
  });
  return removed ? ok({ ok: true }) : fail(404, "Attempt not found");
}
