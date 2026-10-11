import { z } from "zod";
import { adminOrError, ok, parseBody } from "@/lib/api";
import { generateLayout, solutionGrid } from "@/lib/crossword";

/** Live grid preview for the mission editor. Tolerates half-typed words. */
export async function POST(req: Request) {
  const auth = await adminOrError();
  if ("error" in auth) return auth.error;
  const parsed = await parseBody(
    req,
    z.object({ words: z.array(z.object({ answer: z.string(), clue: z.string().optional() })).max(30) }),
  );
  if ("error" in parsed) return parsed.error;
  const words = parsed.data.words.map((w) => ({ answer: w.answer, clue: w.clue ?? "" }));
  const layout = generateLayout(words);
  const solution = Object.fromEntries(solutionGrid(words, layout));
  return ok({ layout, solution });
}
