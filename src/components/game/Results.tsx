"use client";
import { ArrowRight, Check, Clock, Home, Lightbulb, RotateCcw, Volume2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Stars } from "@/components/Stars";
import { formatDuration } from "@/lib/labels";
import { canSpeak, speak } from "@/lib/speech";
import type { Attempt, Direction } from "@/lib/types";
import { Confetti } from "./Confetti";
import { SpeakPractice } from "./SpeakPractice";

export interface ResultData {
  attempt: Attempt;
  stars: number;
  review: {
    clueId: string;
    number: number;
    direction: Direction;
    clue: string;
    answer: string;
    note: string;
    example: string;
    correct: boolean;
  }[];
}

const MESSAGES = ["Keep practising!", "Good effort!", "Great job!", "Perfect mission!"];

export function Results({
  data,
  missionId,
  title,
  category,
  nextMission,
}: {
  data: ResultData;
  missionId: string;
  title: string;
  category: { name: string; icon: string; slug: string };
  nextMission: { id: string; title: string } | null;
}) {
  const { attempt, stars, review } = data;
  const [speechOk, setSpeechOk] = useState(false);
  const [spoken, setSpoken] = useState<Set<string>>(new Set());
  const [shownScore, setShownScore] = useState(0);
  useEffect(() => setSpeechOk(canSpeak()), []);

  // Count the score up for a bit of drama.
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setShownScore(Math.round(attempt.score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [attempt.score]);

  const pct = attempt.totalWords ? Math.round((attempt.correctWords / attempt.totalWords) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {stars === 3 && <Confetti />}
      <section className="card relative overflow-hidden p-8 text-center animate-rise">
        <div className="absolute inset-x-0 -top-24 mx-auto size-64 rounded-full bg-gradient-to-br from-brand-500/30 to-fuchsia-500/30 blur-3xl" />
        <div className="relative">
          <div className="text-sm font-semibold muted">
            {category.icon} {category.name} · {title}
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">{MESSAGES[stars]}</h1>
          <div className="mt-5 flex justify-center">
            <Stars count={stars} size="size-10" />
          </div>
          <div className="mt-4 font-display text-6xl font-bold tabular-nums tracking-tight">
            {shownScore}
            <span className="text-2xl muted">/1000</span>
          </div>
          <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 text-sm">
            <Stat icon={<Check className="size-4 text-emerald-500" />} label="Correct" value={`${attempt.correctWords}/${attempt.totalWords}`} sub={`${pct}%`} />
            <Stat icon={<Clock className="size-4 text-sky-500" />} label="Time" value={formatDuration(attempt.durationSec)} />
            <Stat icon={<Lightbulb className="size-4 text-amber-500" />} label="Hints" value={String(attempt.hintsUsed)} sub={`${attempt.checksUsed} checks`} />
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <a href={`/play/${missionId}`} className="btn-outline">
              <RotateCcw className="size-4" /> Play again
            </a>
            {nextMission ? (
              <a href={`/play/${nextMission.id}`} className="btn-primary">
                Next: {nextMission.title} <ArrowRight className="size-4" />
              </a>
            ) : (
              <Link href="/" className="btn-primary">
                <Home className="size-4" /> All missions
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <h2 className="font-display text-xl font-bold">Review & speak</h2>
          {spoken.size > 0 && (
            <span className="text-xs font-semibold text-pink-500">🎙️ {spoken.size}/{review.length} pronounced</span>
          )}
        </div>
        <p className="px-1 text-sm muted">Listen to each answer, read the note, then press “Say it” to practise pronunciation.</p>
        {review.map((w, i) => (
          <article
            key={w.clueId}
            className="card p-5 animate-rise"
            style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${
                  w.correct ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
                }`}
              >
                {w.correct ? <Check className="size-4" /> : <X className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs muted">
                  {w.number} {w.direction} · {w.clue}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex gap-0.5">
                    {w.answer.split("").map((l, j) => (
                      <span
                        key={j}
                        className="flex size-7 items-center justify-center rounded-md border hairline bg-[var(--cell)] font-display text-sm font-bold"
                      >
                        {l}
                      </span>
                    ))}
                  </span>
                  {speechOk && (
                    <button className="btn-ghost size-8 rounded-lg p-0" onClick={() => speak(w.answer.toLowerCase())} aria-label={`Listen to ${w.answer}`}>
                      <Volume2 className="size-4" />
                    </button>
                  )}
                </div>
                {w.note && <p className="mt-3 text-sm">💡 {w.note}</p>}
                {w.example && (
                  <p className="mt-2 flex items-start gap-2 text-sm italic muted">
                    “{w.example}”
                    {speechOk && (
                      <button className="shrink-0 not-italic text-brand-500 hover:underline" onClick={() => speak(w.example)}>
                        listen
                      </button>
                    )}
                  </p>
                )}
                <div className="mt-3">
                  <SpeakPractice word={w.answer} onSuccess={() => setSpoken((s) => new Set(s).add(w.clueId))} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-black/[.03] p-3 dark:bg-white/5">
      <div className="flex items-center justify-center gap-1.5 text-xs muted">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
      {sub && <div className="text-[11px] muted">{sub}</div>}
    </div>
  );
}
