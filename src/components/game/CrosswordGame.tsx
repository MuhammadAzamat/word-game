"use client";
import {
  ArrowLeft,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Lightbulb,
  Loader2,
  Send,
  Timer,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDuration } from "@/lib/labels";
import { canSpeak, speak } from "@/lib/speech";
import type { Direction, PublicPuzzle } from "@/lib/types";
import { Results, type ResultData } from "./Results";

type Clue = PublicPuzzle["clues"][number];

interface Props {
  missionId: string;
  title: string;
  category: { name: string; icon: string; color: string; slug: string };
  timeLimit: number;
  puzzle: PublicPuzzle;
  nextMission: { id: string; title: string } | null;
}

const k = (r: number, c: number) => `${r},${c}`;

function cellsOf(clue: Clue) {
  return Array.from({ length: clue.length }, (_, i) =>
    clue.direction === "across" ? k(clue.row, clue.col + i) : k(clue.row + i, clue.col),
  );
}

export function CrosswordGame({ missionId, title, category, timeLimit, puzzle, nextMission }: Props) {
  // ----- static geometry -----
  const cellSet = useMemo(() => new Map(puzzle.cells.map((c) => [k(c.r, c.c), c])), [puzzle]);
  const clueCells = useMemo(() => new Map(puzzle.clues.map((c) => [c.id, cellsOf(c)])), [puzzle]);
  const cellClues = useMemo(() => {
    const m = new Map<string, Partial<Record<Direction, string>>>();
    for (const clue of puzzle.clues)
      for (const cell of clueCells.get(clue.id)!) m.set(cell, { ...m.get(cell), [clue.direction]: clue.id });
    return m;
  }, [puzzle, clueCells]);
  const orderedClues = useMemo(
    () => [...puzzle.clues].sort((a, b) => (a.direction === b.direction ? a.number - b.number : a.direction === "across" ? -1 : 1)),
    [puzzle],
  );

  // ----- game state -----
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string>(() => cellsOf(orderedClues[0])[0]);
  const [dir, setDir] = useState<Direction>(orderedClues[0]?.direction ?? "across");
  const [hints, setHints] = useState(0);
  const [checks, setChecks] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState<null | "hint" | "check" | "submit">(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const started = useRef(false);

  useEffect(() => setSpeechOk(canSpeak()), []);

  const activeClueId = cellClues.get(active)?.[dir] ?? Object.values(cellClues.get(active) ?? {})[0];
  const activeClue = puzzle.clues.find((c) => c.id === activeClueId)!;
  const activeWord = useMemo(() => new Set(clueCells.get(activeClueId!) ?? []), [clueCells, activeClueId]);
  const filled = puzzle.cells.every((c) => entries[k(c.r, c.c)]);
  const remaining = timeLimit > 0 ? Math.max(0, timeLimit - elapsed) : null;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  // Start an attempt once (guarded against StrictMode double effects).
  const start = useCallback(async () => {
    setStartError(null);
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ missionId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setStartError(data.error ?? "Could not start the mission");
    setAttemptId(data.attemptId);
  }, [missionId]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  // Timer
  useEffect(() => {
    if (!attemptId || result) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [attemptId, result]);

  const submit = useCallback(async () => {
    if (!attemptId) return;
    setBusy("submit");
    setConfirmSubmit(false);
    const res = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return flash(data.error ?? "Could not submit");
    setResult(data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [attemptId, entries, flash]);

  // Auto-submit when the countdown runs out.
  useEffect(() => {
    if (remaining === 0 && !result && busy !== "submit") void submit();
  }, [remaining, result, busy, submit]);

  // ----- movement helpers -----
  const focusInput = () => inputRef.current?.focus({ preventScroll: true });

  const select = (cell: string, preferDir?: Direction) => {
    const clues = cellClues.get(cell);
    if (!clues) return;
    if (cell === active && !preferDir && clues.across && clues.down) setDir((d) => (d === "across" ? "down" : "across"));
    else {
      const want = preferDir ?? dir;
      setDir(clues[want] ? want : clues.across ? "across" : "down");
    }
    setActive(cell);
    focusInput();
  };

  const selectClue = (clue: Clue) => {
    const cells = clueCells.get(clue.id)!;
    setDir(clue.direction);
    setActive(cells.find((c) => !entries[c]) ?? cells[0]);
    focusInput();
  };

  const stepClue = (delta: number) => {
    const i = orderedClues.findIndex((c) => c.id === activeClueId);
    selectClue(orderedClues[(i + delta + orderedClues.length) % orderedClues.length]);
  };

  const moveInWord = (delta: number) => {
    const cells = clueCells.get(activeClueId!)!;
    const i = cells.indexOf(active);
    const next = cells[i + delta];
    if (next) setActive(next);
  };

  const moveArrow = (dr: number, dc: number) => {
    const want: Direction = dc !== 0 ? "across" : "down";
    if (want !== dir && cellClues.get(active)?.[want]) return setDir(want);
    const [r, c] = active.split(",").map(Number);
    for (let i = 1; i < Math.max(puzzle.rows, puzzle.cols); i++) {
      const cand = k(r + dr * i, c + dc * i);
      if (cellSet.has(cand)) return select(cand, want);
    }
  };

  const typeLetter = (ch: string) => {
    if (result) return;
    const letter = ch.toUpperCase();
    if (!locked.has(active)) {
      setEntries((e) => ({ ...e, [active]: letter }));
      setWrong((w) => { if (!w.has(active)) return w; const n = new Set(w); n.delete(active); return n; });
    }
    moveInWord(1);
  };

  const erase = () => {
    if (result) return;
    if (entries[active] && !locked.has(active)) {
      setEntries((e) => { const n = { ...e }; delete n[active]; return n; });
      return;
    }
    const cells = clueCells.get(activeClueId!)!;
    const prev = cells[cells.indexOf(active) - 1];
    if (prev) {
      setActive(prev);
      if (!locked.has(prev)) setEntries((e) => { const n = { ...e }; delete n[prev]; return n; });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key;
    if (/^[a-zA-Z]$/.test(key)) { e.preventDefault(); typeLetter(key); return; }
    const handlers: Record<string, () => void> = {
      Backspace: erase,
      Delete: erase,
      ArrowLeft: () => moveArrow(0, -1),
      ArrowRight: () => moveArrow(0, 1),
      ArrowUp: () => moveArrow(-1, 0),
      ArrowDown: () => moveArrow(1, 0),
      Home: () => setActive(clueCells.get(activeClueId!)![0]),
      End: () => setActive(clueCells.get(activeClueId!)!.at(-1)!),
      Tab: () => stepClue(e.shiftKey ? -1 : 1),
      Enter: () => stepClue(1),
      " ": () => cellClues.get(active)?.[dir === "across" ? "down" : "across"] && setDir((d) => (d === "across" ? "down" : "across")),
    };
    if (handlers[key]) { e.preventDefault(); handlers[key](); }
  };

  // Mobile keyboards often send keyCode 229 with no usable key, so read the input value instead.
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ch = e.target.value.replace(/[^a-zA-Z]/g, "").slice(-1);
    e.target.value = "";
    if (ch) typeLetter(ch);
  };

  // ----- tools -----
  async function revealLetter() {
    if (!attemptId || locked.has(active)) return;
    setBusy("hint");
    const res = await fetch(`/api/attempts/${attemptId}/hint`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cell: active }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return flash(data.error ?? "Hint failed");
    const cell = active;
    setEntries((e) => ({ ...e, [cell]: data.letter }));
    setLocked((l) => new Set(l).add(cell));
    setWrong((w) => { const n = new Set(w); n.delete(cell); return n; });
    setHints(data.hintsUsed);
    moveInWord(1);
    focusInput();
  }

  async function checkGrid() {
    if (!attemptId) return;
    setBusy("check");
    const res = await fetch(`/api/attempts/${attemptId}/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return flash(data.error ?? "Check failed");
    setChecks(data.checksUsed);
    setWrong(new Set(data.wrong));
    const filledCount = Object.values(entries).filter(Boolean).length;
    flash(data.wrong.length ? `${data.wrong.length} letter${data.wrong.length > 1 ? "s" : ""} to fix` : filledCount ? "Everything so far is correct ✨" : "Fill in some letters first");
    focusInput();
  }

  const clearWord = () => {
    const cells = clueCells.get(activeClueId!)!;
    setEntries((e) => { const n = { ...e }; for (const c of cells) if (!locked.has(c)) delete n[c]; return n; });
    setActive(cells[0]);
    focusInput();
  };

  if (result) {
    return <Results data={result} missionId={missionId} title={title} category={category} nextMission={nextMission} />;
  }

  // ----- render -----
  const clueDone = (clue: Clue) => clueCells.get(clue.id)!.every((c) => entries[c]);
  // Fit the grid on narrow screens: page gutters + card padding + the gaps between cells.
  const cellPx = `min(2.75rem, calc((100vw - 5rem - ${(puzzle.cols - 1) * 3}px) / ${puzzle.cols}))`;

  return (
    <div className="animate-rise">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href={`/categories/${category.slug}`} className="btn-ghost -ml-3">
          <ArrowLeft className="size-4" /> {category.icon} {category.name}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="chip glass" title="Letters revealed">
            <Lightbulb className="size-3.5 text-amber-500" /> {hints}
          </span>
          <span className="chip glass" title="Checks used">
            <CheckCheck className="size-3.5 text-sky-500" /> {checks}
          </span>
          <span className={`chip glass font-mono ${remaining !== null && remaining <= 30 ? "text-rose-500 animate-pulse" : ""}`}>
            <Timer className="size-3.5" /> {formatDuration(remaining ?? elapsed)}
          </span>
        </div>
      </div>
      <h1 className="mb-6 font-display text-2xl font-bold sm:text-3xl">{title}</h1>

      {startError && (
        <div className="card mb-6 flex items-center justify-between gap-3 p-4 text-sm text-rose-500">
          {startError}
          <button className="btn-outline" onClick={() => void start()}>Retry</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
        <div className="min-w-0 space-y-4">
          {/* Current clue bar */}
          <div className="card sticky top-[4.5rem] z-20 flex items-center gap-2 p-2 lg:static">
            <button className="btn-ghost size-10 shrink-0 p-0" onClick={() => stepClue(-1)} aria-label="Previous clue">
              <ChevronLeft className="size-5" />
            </button>
            <div className="min-w-0 flex-1 px-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-brand-500">
                {activeClue.number} {activeClue.direction} · {activeClue.length} letters
              </div>
              <div className="text-sm font-medium leading-snug sm:text-base">{activeClue.clue}</div>
            </div>
            {speechOk && (
              <button className="btn-ghost size-10 shrink-0 p-0" onClick={() => speak(activeClue.clue)} aria-label="Read clue aloud">
                <Volume2 className="size-5" />
              </button>
            )}
            <button className="btn-ghost size-10 shrink-0 p-0" onClick={() => stepClue(1)} aria-label="Next clue">
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Grid */}
          <div className="card relative mx-auto w-fit p-3 sm:p-4" onClick={focusInput}>
            <input
              ref={inputRef}
              className="absolute left-0 top-0 h-px w-px opacity-0"
              aria-label="Crossword input"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              onKeyDown={onKeyDown}
              onChange={onChange}
              autoFocus
            />
            <div
              className="grid gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${puzzle.cols}, ${cellPx})`, gridTemplateRows: `repeat(${puzzle.rows}, ${cellPx})` }}
              role="grid"
            >
              {Array.from({ length: puzzle.rows * puzzle.cols }, (_, i) => {
                const r = Math.floor(i / puzzle.cols);
                const c = i % puzzle.cols;
                const key = k(r, c);
                const cell = cellSet.get(key);
                if (!cell) return <div key={key} aria-hidden />;
                const isActive = key === active;
                const inWord = activeWord.has(key);
                const isWrong = wrong.has(key);
                const isLocked = locked.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => { e.stopPropagation(); select(key); }}
                    className={`relative flex items-center justify-center rounded-[6px] border font-display font-bold uppercase transition-colors duration-100 ${
                      isActive
                        ? "z-10 border-brand-500 bg-[var(--cell-active)] ring-2 ring-brand-500"
                        : inWord
                          ? "border-brand-400/40 bg-[var(--cell-word)]"
                          : "hairline bg-[var(--cell)]"
                    } ${isWrong ? "!bg-rose-500/20 !border-rose-500 text-rose-600 dark:text-rose-300 animate-shake" : ""} ${
                      isLocked ? "text-brand-600 dark:text-brand-400" : ""
                    }`}
                    style={{ fontSize: `calc(${cellPx} * 0.5)` }}
                    aria-label={`Row ${r + 1}, column ${c + 1}${entries[key] ? `, ${entries[key]}` : ""}`}
                  >
                    {cell.n && (
                      <span className="absolute left-[3px] top-[1px] font-sans text-[9px] font-semibold leading-none opacity-60 sm:text-[10px]">
                        {cell.n}
                      </span>
                    )}
                    {entries[key] && <span key={entries[key]} className="animate-pop">{entries[key]}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tools */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button className="btn-outline" onClick={revealLetter} disabled={!attemptId || !!busy || locked.has(active)} title="Costs 25 points">
              {busy === "hint" ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4 text-amber-500" />} Reveal
            </button>
            <button className="btn-outline" onClick={checkGrid} disabled={!attemptId || !!busy} title="Costs 10 points">
              {busy === "check" ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4 text-sky-500" />} Check
            </button>
            <button className="btn-outline" onClick={clearWord} disabled={!attemptId}>
              <Eraser className="size-4" /> Clear word
            </button>
            <button
              className={`btn-primary ${filled ? "animate-pulse" : ""}`}
              onClick={() => (filled ? submit() : setConfirmSubmit(true))}
              disabled={!attemptId || !!busy}
            >
              {busy === "submit" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Finish
            </button>
          </div>
          <p className="text-center text-xs muted">
            Type to fill · arrows to move · <kbd className="font-mono">Space</kbd> switches direction ·{" "}
            <kbd className="font-mono">Tab</kbd> next clue
          </p>
        </div>

        {/* Clue lists */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {(["across", "down"] as Direction[]).map((d) => (
            <div key={d} className="card p-4">
              <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wider muted">{d}</h2>
              <ol className="space-y-0.5">
                {orderedClues
                  .filter((c) => c.direction === d)
                  .map((clue) => {
                    const isActive = clue.id === activeClueId;
                    const done = clueDone(clue);
                    return (
                      <li key={clue.id}>
                        <button
                          type="button"
                          onClick={() => selectClue(clue)}
                          className={`flex w-full gap-3 rounded-xl px-2 py-2 text-left text-sm transition ${
                            isActive ? "bg-brand-500/12 ring-1 ring-brand-500/40" : "hover:bg-black/5 dark:hover:bg-white/5"
                          } ${done && !isActive ? "opacity-50" : ""}`}
                        >
                          <span className={`w-5 shrink-0 text-right font-bold ${isActive ? "text-brand-500" : ""}`}>{clue.number}</span>
                          <span className={done ? "line-through decoration-brand-500/50" : ""}>
                            {clue.clue} <span className="muted">({clue.length})</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={() => setConfirmSubmit(false)}>
          <div className="card w-full max-w-sm p-6 animate-rise" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">Finish now?</h3>
            <p className="mt-1 text-sm muted">
              {puzzle.cells.filter((c) => !entries[k(c.r, c.c)]).length} squares are still empty. Unfinished words count as wrong.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirmSubmit(false)}>Keep playing</button>
              <button className="btn-primary" onClick={submit}>Finish</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" role="status">
          <div className="rounded-2xl bg-[var(--text)] px-4 py-2.5 text-sm font-medium text-[var(--bg)] shadow-xl animate-rise">{toast}</div>
        </div>
      )}
    </div>
  );
}
