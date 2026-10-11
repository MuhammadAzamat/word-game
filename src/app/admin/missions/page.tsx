import { MissionTable } from "@/components/admin/MissionTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { getCategories, readAll } from "@/lib/db";

export const metadata = { title: "Missions" };

export default async function AdminMissions() {
  const [missions, categories, attempts] = await Promise.all([readAll("missions"), getCategories(), readAll("attempts")]);
  const order = new Map(categories.map((c, i) => [c.id, i]));
  const rows = missions
    .sort((a, b) => (order.get(a.categoryId) ?? 99) - (order.get(b.categoryId) ?? 99) || a.title.localeCompare(b.title))
    .map((m) => ({
      id: m.id,
      title: m.title,
      categoryId: m.categoryId,
      focus: m.focus,
      difficulty: m.difficulty,
      level: m.level,
      published: m.published,
      updatedAt: m.updatedAt,
      words: m.words.length,
      plays: attempts.filter((a) => a.missionId === m.id && a.status === "completed").length,
    }));
  return (
    <>
      <PageHeader title="Missions" subtitle="Create crosswords, edit clues and publish when ready." />
      <MissionTable rows={rows} categories={categories} />
    </>
  );
}
