import { adminOrError, fail, ok, parseBody } from "@/lib/api";
import { mutate, newId } from "@/lib/db";
import { categorySchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const parsed = await parseBody(req, categorySchema);
  if ("error" in parsed) return parsed.error;

  const created = await mutate("categories", (rows) => {
    if (rows.some((c) => c.slug === parsed.data.slug)) return null;
    const c = { id: newId("cat"), ...parsed.data };
    rows.push(c);
    return c;
  });
  if (!created) return fail(409, "Slug already in use", { slug: "Already in use" });
  return ok(created, { status: 201 });
}
