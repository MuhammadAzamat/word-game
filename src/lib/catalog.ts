import "server-only";
import type { MissionSummary } from "@/components/MissionCard";
import { getBestScores, getCategories, getMissions } from "./db";
import type { Mission } from "./types";

export async function missionSummaries(userId: string | null, filter?: (m: Mission) => boolean) {
  const [categories, missions, best] = await Promise.all([
    getCategories(),
    getMissions(),
    userId ? getBestScores(userId) : Promise.resolve(new Map<string, number>()),
  ]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const order = new Map(categories.map((c, i) => [c.id, i]));
  const items: MissionSummary[] = missions
    .filter((m) => byId.has(m.categoryId) && (!filter || filter(m)))
    .sort((a, b) => order.get(a.categoryId)! - order.get(b.categoryId)! || a.createdAt.localeCompare(b.createdAt))
    .map((m) => {
      const c = byId.get(m.categoryId)!;
      return {
        mission: {
          id: m.id,
          title: m.title,
          description: m.description,
          focus: m.focus,
          difficulty: m.difficulty,
          level: m.level,
          timeLimit: m.timeLimit,
          wordCount: m.words.length,
        },
        category: { name: c.name, icon: c.icon, color: c.color, slug: c.slug },
        best: best.get(m.id) ?? null,
      };
    });
  return { categories, missions, items, best };
}
