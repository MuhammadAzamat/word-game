import { AttemptTable } from "@/components/admin/AttemptTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { readAll } from "@/lib/db";

export const metadata = { title: "Attempts" };

export default async function AdminAttempts() {
  const [attempts, users, missions] = await Promise.all([readAll("attempts"), readAll("users"), readAll("missions")]);
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const missionTitle = new Map(missions.map((m) => [m.id, m.title]));
  const rows = attempts
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((a) => ({
      ...a,
      userName: userName.get(a.userId) ?? "Deleted user",
      missionTitle: missionTitle.get(a.missionId) ?? "Deleted mission",
    }));
  return (
    <>
      <PageHeader title="Attempts" subtitle="Every game played, with scores, hints and timing." />
      <AttemptTable rows={rows} />
    </>
  );
}
