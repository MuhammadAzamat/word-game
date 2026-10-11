import { z } from "zod";
import { fail, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { getMission, mutate, newId } from "@/lib/db";
import { generateLayout } from "@/lib/crossword";
import type { Attempt } from "@/lib/types";

/** Starts a new attempt. Any unfinished attempt on the same mission is marked abandoned. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (!user) return fail(401, "Sign in required");
  const parsed = await parseBody(req, z.object({ missionId: z.string() }));
  if ("error" in parsed) return parsed.error;

  const mission = await getMission(parsed.data.missionId);
  if (!mission || (!mission.published && user.role !== "admin")) return fail(404, "Mission not found");
  const layout = generateLayout(mission.words);

  const attempt = await mutate("attempts", (rows) => {
    for (const a of rows) {
      if (a.userId === user.id && a.missionId === mission.id && a.status === "in_progress") {
        a.status = "abandoned";
        a.finishedAt = new Date().toISOString();
      }
    }
    const a: Attempt = {
      id: newId("a"),
      userId: user.id,
      missionId: mission.id,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: "in_progress",
      hintsUsed: 0,
      checksUsed: 0,
      correctWords: 0,
      totalWords: layout.placements.length,
      score: 0,
      durationSec: 0,
    };
    rows.push(a);
    return a;
  });
  return ok({ attemptId: attempt.id, startedAt: attempt.startedAt });
}
