import { fail, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { solutionGrid } from "@/lib/crossword";
import { mutate } from "@/lib/db";
import { loadActiveAttempt } from "@/lib/game";
import { entriesSchema } from "@/lib/schemas";

/** Returns the filled cells that are wrong, without revealing the right letters. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return fail(401, "Sign in required");
  const { id } = await params;
  const parsed = await parseBody(req, entriesSchema);
  if ("error" in parsed) return parsed.error;

  const ctx = await loadActiveAttempt(id, user);
  if ("error" in ctx) return fail(ctx.status, ctx.error);
  const solution = solutionGrid(ctx.mission.words, ctx.layout);
  const wrong = Object.entries(parsed.data.entries)
    .filter(([cell, letter]) => letter && solution.has(cell) && solution.get(cell) !== letter.toUpperCase())
    .map(([cell]) => cell);

  const checksUsed = await mutate("attempts", (rows) => {
    const a = rows.find((r) => r.id === id)!;
    a.checksUsed += 1;
    return a.checksUsed;
  });
  return ok({ wrong, checksUsed });
}
