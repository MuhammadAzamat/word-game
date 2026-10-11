import { fail, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { computeScore, gradeEntries, normalizeAnswer, starsFor } from "@/lib/crossword";
import { mutate } from "@/lib/db";
import { loadActiveAttempt } from "@/lib/game";
import { entriesSchema } from "@/lib/schemas";

/** Grades the grid on the server, stores the result and returns a full review. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return fail(401, "Sign in required");
  const { id } = await params;
  const parsed = await parseBody(req, entriesSchema);
  if ("error" in parsed) return parsed.error;

  const ctx = await loadActiveAttempt(id, user);
  if ("error" in ctx) return fail(ctx.status, ctx.error);
  const { mission, layout } = ctx;

  const results = gradeEntries(mission.words, layout, parsed.data.entries);
  const correctWords = results.filter((r) => r.correct).length;
  const finishedAt = new Date();

  const attempt = await mutate("attempts", (rows) => {
    const a = rows.find((r) => r.id === id)!;
    a.durationSec = Math.max(1, Math.round((finishedAt.getTime() - Date.parse(a.startedAt)) / 1000));
    a.correctWords = correctWords;
    a.totalWords = results.length;
    a.score = computeScore({
      correctWords,
      totalWords: results.length,
      hintsUsed: a.hintsUsed,
      checksUsed: a.checksUsed,
      durationSec: a.durationSec,
      timeLimit: mission.timeLimit,
    });
    a.status = "completed";
    a.finishedAt = finishedAt.toISOString();
    return { ...a };
  });

  const review = layout.placements.map((p, i) => {
    const w = mission.words[p.wordIndex];
    return {
      clueId: results[i].clueId,
      number: p.number,
      direction: p.direction,
      clue: w.clue,
      answer: normalizeAnswer(w.answer),
      note: w.note ?? "",
      example: w.example ?? "",
      correct: results[i].correct,
    };
  });

  return ok({ attempt, stars: starsFor(attempt.score), review });
}
