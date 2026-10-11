"use client";
import { Flame, Star, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ErrorState, PageSpinner, RequireAuth, useRpc } from "@/components/session";
import { Stars } from "@/components/Stars";
import { starsFor } from "@/lib/crossword";
import { FOCUS, formatDate, formatDuration } from "@/lib/labels";

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RequireAuth>
        <Profile />
      </RequireAuth>
    </Suspense>
  );
}

function Profile() {
  const { data, error, reload } = useRpc("profile");
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <PageSpinner />;
  const { user } = data;

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
          { icon: Trophy, label: "Missions completed", value: data.completed, color: "text-brand-500" },
          { icon: Star, label: "Stars earned", value: data.stars, color: "text-amber-500" },
          { icon: Target, label: "Words solved", value: data.wordsSolved, color: "text-emerald-500" },
          { icon: Flame, label: "Day streak", value: data.streak, color: "text-rose-500" },
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
          {data.skills.map((f) => (
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
        {data.recent.length === 0 ? (
          <div className="px-6 pb-8 text-sm muted">
            No finished missions yet.{" "}
            <Link href="/#missions" className="font-semibold text-brand-500 hover:underline">
              Pick your first one →
            </Link>
          </div>
        ) : (
          <ul>
            {data.recent.map((a) => (
              <li key={a.id} className="border-t hairline">
                <Link href={`/play?id=${a.missionId}`} className="flex items-center gap-4 px-6 py-3.5 transition hover:bg-black/[.03] dark:hover:bg-white/5">
                  <span className="text-2xl">{a.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{a.missionTitle}</div>
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
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
