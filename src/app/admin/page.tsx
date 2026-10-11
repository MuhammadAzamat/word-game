"use client";
import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { ErrorState, PageSpinner, useRpc } from "@/components/session";
import { formatDate } from "@/lib/labels";

export default function AdminDashboard() {
  const { data, error, reload } = useRpc("admin.dashboard");
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <PageSpinner />;
  const maxDay = Math.max(1, ...data.days.map((d) => d.n));

  const stats = [
    { label: "Users", value: data.users, href: "/admin/users" },
    { label: "Missions", value: data.published, sub: `${data.drafts} drafts`, href: "/admin/missions" },
    { label: "Categories", value: data.categories, href: "/admin/categories" },
    { label: "Completed attempts", value: data.completed, sub: `avg score ${data.avgScore}`, href: "/admin/attempts" },
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
          {data.days.map((d) => (
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
          {data.top.length === 0 && <div className="px-5 pb-5 text-sm muted">No plays yet.</div>}
          {data.top.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-t hairline px-5 py-3 text-sm">
              <span className="truncate">{t.title}</span>
              <span className="muted">
                {t.plays} plays · avg {t.avg}
              </span>
            </div>
          ))}
        </div>
        <div className="card overflow-hidden">
          <div className="p-5 pb-2 text-sm font-semibold">Latest attempts</div>
          {data.latest.length === 0 && <div className="px-5 pb-5 text-sm muted">No attempts yet.</div>}
          {data.latest.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border-t hairline px-5 py-3 text-sm">
              <span className="truncate">
                <b>{a.user}</b> · {a.mission}
              </span>
              <span className="shrink-0 muted">
                {a.score} · {formatDate(a.finishedAt)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
