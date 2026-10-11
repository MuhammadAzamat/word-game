import "server-only";
import { generateLayout } from "./crossword";
import { getMission, readAll } from "./db";
import type { Attempt, CrosswordLayout, Mission, PublicUser } from "./types";

type Loaded =
  | { error: string; status: number }
  | { attempt: Attempt; mission: Mission; layout: CrosswordLayout };

/** Loads an in-progress attempt that belongs to the user, with its mission and grid. */
export async function loadActiveAttempt(id: string, user: PublicUser): Promise<Loaded> {
  const attempt = (await readAll("attempts")).find((a) => a.id === id);
  if (!attempt || attempt.userId !== user.id) return { error: "Attempt not found", status: 404 };
  if (attempt.status !== "in_progress") return { error: "This attempt is already finished", status: 409 };
  const mission = await getMission(attempt.missionId);
  if (!mission) return { error: "Mission no longer exists", status: 404 };
  return { attempt, mission, layout: generateLayout(mission.words) };
}
