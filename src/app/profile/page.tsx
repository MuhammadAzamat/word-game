import { Flame, Star, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { Stars } from "@/components/Stars";
import { requireUser } from "@/lib/auth";
import { starsFor } from "@/lib/crossword";
import { getAttemptsForUser, getBestScores, getCategories, getMissions } from "@/lib/db";
import { FOCUS, formatDate, formatDuration } from "@/lib/labels";
import type { Focus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "My progress" };

/** Consecutive days (ending today or yesterday) with at least one completed mission. */
function streak(dates: string[]) {
  const days = new Set(dates.map((d) => d.slice(0, 10)));
  const day = new Date();
  if (!days.has(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() - 1);
  let n = 0;
  while (days.has(day.toISOString().slice(0, 10))) {
    n++;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return n;
}

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const [attempts, best, missions, categories] = await Promise.all([
    getAttemptsForUser(user.id),
    getBestScores(user.id),
    getMissions({ includeDrafts: true }),
    getCategories(),
  ]);
  const missionById = new Map(missions.map((m) => [m.id, m]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const completed = attempts.filter((a) => a.status === "completed");
  const stars = [...best.values()].reduce((s, v) => s + starsFor(v), 0);
  const totalWords = completed.reduce((s, a) => s + a.correctWords, 0);

  const focusProgress = (Object.keys(FOCUS) as Focus[]).map((f) => {
    const pool = missions.filter((m) => m.published && m.focus === f);
    const done = pool.filter((m) => best.has(m.id)).length;
    return { focus: f, done, total: pool.length };
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center animate-rise">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-fuchsia-500 font-display text-2xl font-bold text-white shadow-lg">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">{user.name}</h1>
          <p className="muted">Member since {new Date(user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Trophy, label: "Missions completed", value: best.size, color: "text-brand-500" },
          { icon: Star, label: "Stars earned", value: stars, color: "text-amber-500" },
          { icon: Target, label: "Words solved", value: totalWords, color: "text-emerald-500" },
          { icon: Flame, label: "Day streak", value: streak(completed.map((a) => a.finishedAt!)), color: "text-rose-500" },
        ].map((s, i) => (
          <div key={s.label} className="card p-5 animate-rise" style={{ animationDelay: `${i * 50}ms` }}>
            <s.icon className={`size-5 ${s.color}`} />
            <div className="mt-3 font-display text-3xl font-bold">{s.value}</div>
            <div className="text-xs muted">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="card p-6">
        <h2 className="mb-4 font-display text-lg font-bold">Skills</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {focusProgress.map((f) => (
            <div key={f.focus}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">
                  {FOCUS[f.focus].emoji} {FOCUS[f.focus].label}
                </span>
                <span className="muted">
                  {f.done}/{f.total}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 transition-all"
                  style={{ width: `${f.total ? (f.done / f.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <h2 className="p-6 pb-3 font-display text-lg font-bold">Recent attempts</h2>
        {completed.length === 0 ? (
          <div className="px-6 pb-8 text-sm muted">
            No finished missions yet.{" "}
            <Link href="/#missions" className="font-semibold text-brand-500 hover:underline">
              Pick your first one →
            </Link>
          </div>
        ) : (
          <ul>
            {completed.slice(0, 25).map((a) => {
              const m = missionById.get(a.missionId);
              const c = m && catById.get(m.categoryId);
              return (
                <li key={a.id} className="border-t hairline">
                  <Link href={`/play/${a.missionId}`} className="flex items-center gap-4 px-6 py-3.5 transition hover:bg-black/[.03] dark:hover:bg-white/5">
                    <span className="text-2xl">{c?.icon ?? "🧩"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{m?.title ?? "Deleted mission"}</div>
                      <div className="text-xs muted">
                        {formatDate(a.finishedAt!)} · {a.correctWords}/{a.totalWords} words · {formatDuration(a.durationSec)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold tabular-nums">{a.score}</div>
                      <Stars count={starsFor(a.score)} size="size-3" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
