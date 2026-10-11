import type { CrosswordLayout, Direction, MissionWord, Placement, PublicPuzzle } from "./types.ts";

interface Cell {
  letter: string;
  dirs: Set<Direction>;
}

type Grid = Map<string, Cell>;

const key = (r: number, c: number) => `${r},${c}`;
const step = (d: Direction) => (d === "across" ? [0, 1] : [1, 0]);

export function normalizeAnswer(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "");
}

interface Candidate {
  row: number;
  col: number;
  direction: Direction;
  score: number;
}

function bounds(grid: Grid) {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const k of grid.keys()) {
    const [r, c] = k.split(",").map(Number);
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }
  return { minR, maxR, minC, maxC };
}

/** Returns the number of crossings, or -1 if the word cannot go here. */
function fits(grid: Grid, word: string, row: number, col: number, dir: Direction): number {
  const [dr, dc] = step(dir);
  const before = grid.get(key(row - dr, col - dc));
  const after = grid.get(key(row + dr * word.length, col + dc * word.length));
  if (before || after) return -1;

  let crossings = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid.get(key(r, c));
    if (cell) {
      if (cell.letter !== word[i] || cell.dirs.has(dir)) return -1;
      crossings++;
    } else {
      // Empty cell: its side neighbours must also be empty, otherwise we would
      // create accidental two-letter words.
      const side1 = grid.get(key(r + dc, c + dr));
      const side2 = grid.get(key(r - dc, c - dr));
      if (side1 || side2) return -1;
    }
  }
  return crossings;
}

function place(grid: Grid, word: string, row: number, col: number, dir: Direction) {
  const [dr, dc] = step(dir);
  for (let i = 0; i < word.length; i++) {
    const k = key(row + dr * i, col + dc * i);
    const cell = grid.get(k);
    if (cell) cell.dirs.add(dir);
    else grid.set(k, { letter: word[i], dirs: new Set([dir]) });
  }
}

function bestCandidate(grid: Grid, word: string): Candidate | null {
  const b = bounds(grid);
  let best: Candidate | null = null;
  for (const [k, cell] of grid) {
    const [r, c] = k.split(",").map(Number);
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== cell.letter) continue;
      for (const dir of ["across", "down"] as Direction[]) {
        if (cell.dirs.has(dir)) continue;
        const [dr, dc] = step(dir);
        const row = r - dr * i;
        const col = c - dc * i;
        const crossings = fits(grid, word, row, col, dir);
        if (crossings < 1) continue;
        const endR = row + dr * (word.length - 1);
        const endC = col + dc * (word.length - 1);
        const h = Math.max(b.maxR, endR) - Math.min(b.minR, row) + 1;
        const w = Math.max(b.maxC, endC) - Math.min(b.minC, col) + 1;
        // Prefer more crossings, then compact and roughly square grids.
        const score = crossings * 100 - h * w - Math.abs(h - w) * 2;
        if (!best || score > best.score) best = { row, col, direction: dir, score };
      }
    }
  }
  return best;
}

type Item = { a: string; i: number };

function buildOnce(order: Item[], total: number): CrosswordLayout {
  const grid: Grid = new Map();
  const raw: Omit<Placement, "number">[] = [];
  const first = order[0];
  place(grid, first.a, 0, 0, "across");
  raw.push({ wordIndex: first.i, row: 0, col: 0, direction: "across", length: first.a.length });

  let pending = order.slice(1);
  // Several passes: a word that does not fit now may fit after others are placed.
  for (let pass = 0; pass < 3 && pending.length; pass++) {
    const still: Item[] = [];
    for (const item of pending) {
      const cand = bestCandidate(grid, item.a);
      if (!cand) { still.push(item); continue; }
      place(grid, item.a, cand.row, cand.col, cand.direction);
      raw.push({ wordIndex: item.i, row: cand.row, col: cand.col, direction: cand.direction, length: item.a.length });
    }
    pending = still;
  }

  const b = bounds(grid);
  const shifted = raw.map((p) => ({ ...p, row: p.row - b.minR, col: p.col - b.minC }));

  // Classic numbering: scan row by row, every distinct start cell gets the next number.
  const starts = [...new Set(shifted.map((p) => key(p.row, p.col)))].sort((x, y) => {
    const [r1, c1] = x.split(",").map(Number);
    const [r2, c2] = y.split(",").map(Number);
    return r1 - r2 || c1 - c2;
  });
  const numberOf = new Map(starts.map((s, i) => [s, i + 1]));

  const placements: Placement[] = shifted
    .map((p) => ({ ...p, number: numberOf.get(key(p.row, p.col))! }))
    .sort((x, y) => x.number - y.number || (x.direction === "across" ? -1 : 1));

  const unplaced = Array.from({ length: total }, (_, i) => i)
    .filter((i) => !placements.some((p) => p.wordIndex === i));

  return { rows: b.maxR - b.minR + 1, cols: b.maxC - b.minC + 1, placements, unplaced };
}

/**
 * Builds a crossword layout from a word list. Tries every word as the seed
 * and keeps the grid that fits the most words in the smallest area.
 * Deterministic: the same words always give the same grid, so layouts never
 * need to be stored.
 */
export function generateLayout(words: Pick<MissionWord, "answer">[]): CrosswordLayout {
  const answers = words.map((w) => normalizeAnswer(w.answer));
  const sorted = answers
    .map((a, i) => ({ a, i }))
    .filter((x) => x.a.length >= 2)
    .sort((x, y) => y.a.length - x.a.length || x.i - y.i);
  if (sorted.length === 0) return { rows: 0, cols: 0, placements: [], unplaced: answers.map((_, i) => i) };

  let best: CrosswordLayout | null = null;
  const area = (l: CrosswordLayout) => l.rows * l.cols + Math.abs(l.rows - l.cols) * 4;
  for (let s = 0; s < sorted.length; s++) {
    const order = [sorted[s], ...sorted.filter((_, j) => j !== s)];
    const layout = buildOnce(order, answers.length);
    if (
      !best ||
      layout.unplaced.length < best.unplaced.length ||
      (layout.unplaced.length === best.unplaced.length && area(layout) < area(best))
    ) best = layout;
    if (best.unplaced.length === 0 && s >= 3) break;
  }
  return best!;
}

export const clueId = (p: Pick<Placement, "number" | "direction">) => `${p.number}-${p.direction}`;

/** Strips the answers so the puzzle can be sent to the browser. */
export function toPublicPuzzle(words: MissionWord[], layout: CrosswordLayout): PublicPuzzle {
  const cells = new Map<string, { r: number; c: number; n?: number }>();
  for (const p of layout.placements) {
    const [dr, dc] = step(p.direction);
    for (let i = 0; i < p.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      const k = key(r, c);
      if (!cells.has(k)) cells.set(k, { r, c });
    }
    cells.get(key(p.row, p.col))!.n = p.number;
  }
  return {
    rows: layout.rows,
    cols: layout.cols,
    cells: [...cells.values()],
    clues: layout.placements.map((p) => ({
      id: clueId(p),
      number: p.number,
      direction: p.direction,
      row: p.row,
      col: p.col,
      length: p.length,
      clue: words[p.wordIndex].clue,
    })),
  };
}

/** Map of "r,c" -> correct letter for every cell in the layout. */
export function solutionGrid(words: MissionWord[], layout: CrosswordLayout): Map<string, string> {
  const out = new Map<string, string>();
  for (const p of layout.placements) {
    const answer = normalizeAnswer(words[p.wordIndex].answer);
    const [dr, dc] = step(p.direction);
    for (let i = 0; i < p.length; i++) out.set(key(p.row + dr * i, p.col + dc * i), answer[i]);
  }
  return out;
}

export interface WordResult {
  clueId: string;
  wordIndex: number;
  correct: boolean;
}

/** Grades the player's letters ("r,c" -> letter) word by word. */
export function gradeEntries(
  words: MissionWord[],
  layout: CrosswordLayout,
  entries: Record<string, string>,
): WordResult[] {
  return layout.placements.map((p) => {
    const answer = normalizeAnswer(words[p.wordIndex].answer);
    const [dr, dc] = step(p.direction);
    let correct = true;
    for (let i = 0; i < p.length; i++) {
      const got = (entries[key(p.row + dr * i, p.col + dc * i)] ?? "").toUpperCase();
      if (got !== answer[i]) { correct = false; break; }
    }
    return { clueId: clueId(p), wordIndex: p.wordIndex, correct };
  });
}

/**
 * Score out of 1000: correctness is worth most, then a small time bonus,
 * minus penalties for revealed letters and checks.
 */
export function computeScore(opts: {
  correctWords: number;
  totalWords: number;
  hintsUsed: number;
  checksUsed: number;
  durationSec: number;
  timeLimit: number;
}): number {
  const { correctWords, totalWords, hintsUsed, checksUsed, durationSec, timeLimit } = opts;
  if (totalWords === 0) return 0;
  const accuracy = correctWords / totalWords;
  const base = accuracy * 800;
  const budget = timeLimit > 0 ? timeLimit : totalWords * 45;
  const speed = accuracy === 1 ? Math.max(0, 1 - durationSec / budget) * 200 : 0;
  const penalty = hintsUsed * 25 + checksUsed * 10;
  return Math.max(0, Math.round(base + speed - penalty));
}

export function starsFor(score: number): number {
  if (score >= 850) return 3;
  if (score >= 600) return 2;
  if (score >= 300) return 1;
  return 0;
}
