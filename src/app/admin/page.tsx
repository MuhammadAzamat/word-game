import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { readAll } from "@/lib/db";
import { formatDate } from "@/lib/labels";

export default async function AdminDashboard() {
  const [users, missions, categories, attempts] = await Promise.all([
    readAll("users"),
    readAll("missions"),
    readAll("categories"),
    readAll("attempts"),
  ]);
  const completed = attempts.filter((a) => a.status === "completed");
  const avg = completed.length ? Math.round(completed.reduce((s, a) => s + a.score, 0) / completed.length) : 0;
  const userById = new Map(users.map((u) => [u.id, u]));
  const missionById = new Map(missions.map((m) => [m.id, m]));

  const plays = new Map<string, { n: number; total: number }>();
  for (const a of completed) {
    const p = plays.get(a.missionId) ?? { n: 0, total: 0 };
    plays.set(a.missionId, { n: p.n + 1, total: p.total + a.score });
  }
  const top = [...plays.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 6);

  // Completed attempts per day over the last 14 days.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, n: completed.filter((a) => a.finishedAt?.startsWith(key)).length };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.n));

  const stats = [
    { label: "Users", value: users.length, href: "/admin/users" },
    { label: "Missions", value: `${missions.filter((m) => m.published).length}`, sub: `${missions.filter((m) => !m.published).length} drafts`, href: "/admin/missions" },
    { label: "Categories", value: categories.length, href: "/admin/categories" },
    { label: "Completed attempts", value: completed.length, sub: `avg score ${avg}`, href: "/admin/attempts" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of players, missions and activity." />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:-translate-y-0.5">
            <div className="text-xs muted">{s.label}</div>
            <div className="mt-1 font-display text-3xl font-bold">{s.value}</div>
            {s.sub && <div className="text-xs muted">{s.sub}</div>}
          </Link>
        ))}
      </div>

      <div className="card p-5">
        <div className="mb-4 text-sm font-semibold">Completed attempts · last 14 days</div>
        <div className="flex h-36 items-end gap-1.5">
          {days.map((d) => (
            <div key={d.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] muted opacity-0 group-hover:opacity-100">{d.n}</span>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-brand-500 to-fuchsia-400"
                style={{ height: `${Math.max(4, (d.n / maxDay) * 100)}%`, opacity: d.n ? 1 : 0.2 }}
                title={`${d.key}: ${d.n}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="p-5 pb-2 text-sm font-semibold">Most played missions</div>
          {top.length === 0 && <div className="px-5 pb-5 text-sm muted">No plays yet.</div>}
          {top.map(([id, p]) => (
            <div key={id} className="flex items-center justify-between border-t hairline px-5 py-3 text-sm">
              <span className="truncate">{missionById.get(id)?.title ?? id}</span>
              <span className="muted">
                {p.n} plays · avg {Math.round(p.total / p.n)}
              </span>
            </div>
          ))}
        </div>
        <div className="card overflow-hidden">
          <div className="p-5 pb-2 text-sm font-semibold">Latest attempts</div>
          {completed.length === 0 && <div className="px-5 pb-5 text-sm muted">No attempts yet.</div>}
          {completed
            .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""))
            .slice(0, 6)
            .map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-t hairline px-5 py-3 text-sm">
                <span className="truncate">
                  <b>{userById.get(a.userId)?.name ?? "Deleted user"}</b> · {missionById.get(a.missionId)?.title ?? "Deleted mission"}
                </span>
                <span className="shrink-0 muted">
                  {a.score} · {formatDate(a.finishedAt!)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
