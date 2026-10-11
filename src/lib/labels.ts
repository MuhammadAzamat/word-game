import type { Difficulty, Focus } from "./types";

export const FOCUS: Record<Focus, { label: string; emoji: string; className: string }> = {
  grammar: { label: "Grammar", emoji: "📝", className: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" },
  vocabulary: { label: "Vocabulary", emoji: "🔤", className: "bg-sky-500/12 text-sky-600 dark:text-sky-300" },
  speaking: { label: "Speaking", emoji: "🎙️", className: "bg-pink-500/12 text-pink-600 dark:text-pink-300" },
  knowledge: { label: "World knowledge", emoji: "🌍", className: "bg-amber-500/12 text-amber-600 dark:text-amber-300" },
};

export const DIFFICULTY: Record<Difficulty, { label: string; dots: number; className: string }> = {
  easy: { label: "Easy", dots: 1, className: "text-emerald-500" },
  medium: { label: "Medium", dots: 2, className: "text-amber-500" },
  hard: { label: "Hard", dots: 3, className: "text-rose-500" },
};

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
