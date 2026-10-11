import { adminOrError, fail, ok, parseBody } from "@/lib/api";
import { generateLayout } from "@/lib/crossword";
import { mutate, newId, readAll } from "@/lib/db";
import { missionSchema } from "@/lib/schemas";
import type { Mission } from "@/lib/types";

export async function POST(req: Request) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const parsed = await parseBody(req, missionSchema);
  if ("error" in parsed) return parsed.error;
  const data = parsed.data;

  if (!(await readAll("categories")).some((c) => c.id === data.categoryId)) {
    return fail(422, "Unknown category", { categoryId: "Unknown category" });
  }
  const layout = generateLayout(data.words);
  if (data.published && layout.unplaced.length) {
    return fail(422, "Some words don't fit the grid. Change them or save as a draft.");
  }

  const now = new Date().toISOString();
  const mission: Mission = { id: newId("m"), ...data, createdAt: now, updatedAt: now };
  await mutate("missions", (rows) => void rows.push(mission));
  return ok(mission, { status: 201 });
}
