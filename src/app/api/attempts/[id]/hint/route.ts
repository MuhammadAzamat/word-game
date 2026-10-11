import { z } from "zod";
import { fail, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { solutionGrid } from "@/lib/crossword";
import { mutate } from "@/lib/db";
import { loadActiveAttempt } from "@/lib/game";

/** Reveals one letter. Each reveal costs points at the end. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return fail(401, "Sign in required");
  const { id } = await params;
  const parsed = await parseBody(req, z.object({ cell: z.string().regex(/^\d+,\d+$/) }));
  if ("error" in parsed) return parsed.error;

  const ctx = await loadActiveAttempt(id, user);
  if ("error" in ctx) return fail(ctx.status, ctx.error);
  const letter = solutionGrid(ctx.mission.words, ctx.layout).get(parsed.data.cell);
  if (!letter) return fail(400, "That cell is not part of the puzzle");

  const hintsUsed = await mutate("attempts", (rows) => {
    const a = rows.find((r) => r.id === id)!;
    a.hintsUsed += 1;
    return a.hintsUsed;
  });
  return ok({ letter, hintsUsed });
}
