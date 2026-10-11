import { adminOrError, fail, ok, parseBody } from "@/lib/api";
import { mutate, readAll } from "@/lib/db";
import { categorySchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = await parseBody(req, categorySchema);
  if ("error" in parsed) return parsed.error;

  const result = await mutate("categories", (rows) => {
    const c = rows.find((r) => r.id === id);
    if (!c) return "missing" as const;
    if (rows.some((r) => r.id !== id && r.slug === parsed.data.slug)) return "slug" as const;
    Object.assign(c, parsed.data);
    return c;
  });
  if (result === "missing") return fail(404, "Category not found");
  if (result === "slug") return fail(409, "Slug already in use", { slug: "Already in use" });
  return ok(result);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const inUse = (await readAll("missions")).filter((m) => m.categoryId === id).length;
  if (inUse) return fail(409, `Move or delete its ${inUse} mission(s) first`);
  const removed = await mutate("categories", (rows) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return false;
    rows.splice(i, 1);
    return true;
  });
  return removed ? ok({ ok: true }) : fail(404, "Category not found");
}
