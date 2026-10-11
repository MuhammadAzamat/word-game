import { Clock, Play, Puzzle } from "lucide-react";
import Link from "next/link";
import { starsFor } from "@/lib/crossword";
import { DIFFICULTY, FOCUS } from "@/lib/labels";
import type { MissionSummary } from "@/lib/services";
import { Stars } from "./Stars";

export function MissionCard({ mission, category, best, index = 0 }: MissionSummary & { index?: number }) {
  const focus = FOCUS[mission.focus];
  const diff = DIFFICULTY[mission.difficulty];
  return (
    <Link
      href={`/play?id=${mission.id}`}
      className="card group relative flex flex-col overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-xl animate-rise"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
        style={{ background: category.color }}
      />
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold muted">
        <span
          className="flex size-7 items-center justify-center rounded-lg text-base"
          style={{ background: `${category.color}22` }}
        >
          {category.icon}
        </span>
        {category.name}
        <span className="ml-auto rounded-md border hairline px-1.5 py-0.5 font-mono text-[10px]">{mission.level}</span>
      </div>
      <h3 className="font-display text-lg font-bold leading-tight">{mission.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm muted">{mission.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`chip ${focus.className}`}>
          {focus.emoji} {focus.label}
        </span>
        <span className={`chip bg-black/5 dark:bg-white/5 ${diff.className}`} title={diff.label}>
          {"●".repeat(diff.dots)}
          <span className="opacity-30">{"●".repeat(3 - diff.dots)}</span>
        </span>
      </div>
      <div className="mt-auto flex items-center gap-3 pt-5 text-xs muted">
        <span className="inline-flex items-center gap-1">
          <Puzzle className="size-3.5" /> {mission.wordCount} words
        </span>
        {mission.timeLimit > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {Math.round(mission.timeLimit / 60)} min
          </span>
        )}
        <span className="ml-auto">
          {best !== null ? (
            <Stars count={starsFor(best)} />
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-brand-500 opacity-0 transition group-hover:opacity-100">
              Play <Play className="size-3.5 fill-current" />
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
