import { PageHeader } from "@/components/admin/PageHeader";
import { UserTable } from "@/components/admin/UserTable";
import { requireAdmin, toPublicUser } from "@/lib/auth";
import { readAll } from "@/lib/db";

export const metadata = { title: "Users" };

export default async function AdminUsers() {
  const me = await requireAdmin();
  const [users, attempts] = await Promise.all([readAll("users"), readAll("attempts")]);
  const rows = users
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((u) => {
      const mine = attempts.filter((a) => a.userId === u.id && a.status === "completed");
      return { ...toPublicUser(u), attempts: mine.length, best: Math.max(0, ...mine.map((a) => a.score)) };
    });
  return (
    <>
      <PageHeader title="Users" subtitle={`${users.length} accounts. Promote trusted people to admin.`} />
      <UserTable rows={rows} meId={me.id} />
    </>
  );
}
