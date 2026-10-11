import { notFound } from "next/navigation";
import { CrosswordGame } from "@/components/game/CrosswordGame";
import { requireUser } from "@/lib/auth";
import { generateLayout, toPublicPuzzle } from "@/lib/crossword";
import { getCategories, getMission, getMissions } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const m = await getMission((await params).id);
  return { title: m?.title ?? "Mission" };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/play/${id}`);
  const mission = await getMission(id);
  if (!mission || (!mission.published && user.role !== "admin")) notFound();

  const category = (await getCategories()).find((c) => c.id === mission.categoryId);
  if (!category) notFound();

  const layout = generateLayout(mission.words);
  const puzzle = toPublicPuzzle(mission.words, layout);

  // Next mission: the following one in the same category.
  const all = (await getMissions()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const siblings = all.filter((m) => m.categoryId === mission.categoryId);
  const next = siblings[siblings.findIndex((m) => m.id === mission.id) + 1] ?? null;

  return (
    <CrosswordGame
      key={mission.id}
      missionId={mission.id}
      title={mission.title}
      category={{ name: category.name, icon: category.icon, color: category.color, slug: category.slug }}
      timeLimit={mission.timeLimit}
      puzzle={puzzle}
      nextMission={next ? { id: next.id, title: next.title } : null}
    />
  );
}
