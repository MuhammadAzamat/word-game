import { adminOrError, fail, ok, parseBody } from "@/lib/api";
import { generateLayout } from "@/lib/crossword";
import { mutate, readAll } from "@/lib/db";
import { missionSchema } from "@/lib/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = await parseBody(req, missionSchema);
  if ("error" in parsed) return parsed.error;
  const data = parsed.data;

  if (!(await readAll("categories")).some((c) => c.id === data.categoryId)) {
    return fail(422, "Unknown category", { categoryId: "Unknown category" });
  }
  if (data.published && generateLayout(data.words).unplaced.length) {
    return fail(422, "Some words don't fit the grid. Change them or save as a draft.");
  }

  const updated = await mutate("missions", (rows) => {
    const m = rows.find((r) => r.id === id);
    if (!m) return null;
    Object.assign(m, data, { updatedAt: new Date().toISOString() });
    return m;
  });
  return updated ? ok(updated) : fail(404, "Mission not found");
}

/** Partial update, used for the publish toggle in the list. */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = await parseBody(req, missionSchema.pick({ published: true }));
  if ("error" in parsed) return parsed.error;

  const result = await mutate("missions", (rows) => {
    const m = rows.find((r) => r.id === id);
    if (!m) return "missing" as const;
    if (parsed.data.published && generateLayout(m.words).unplaced.length) return "unfit" as const;
    m.published = parsed.data.published;
    m.updatedAt = new Date().toISOString();
    return m;
  });
  if (result === "missing") return fail(404, "Mission not found");
  if (result === "unfit") return fail(422, "Some words don't fit the grid yet");
  return ok(result);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const removed = await mutate("missions", (rows) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return false;
    rows.splice(i, 1);
    return true;
  });
  if (!removed) return fail(404, "Mission not found");
  await mutate("attempts", (rows) => {
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].missionId === id) rows.splice(i, 1);
  });
  return ok({ ok: true });
}
