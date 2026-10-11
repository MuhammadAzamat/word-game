import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  computeScore,
  generateLayout,
  gradeEntries,
  normalizeAnswer,
  solutionGrid,
  starsFor,
  toPublicPuzzle,
} from "../src/lib/crossword.ts";
import type { Mission, MissionWord } from "../src/lib/types.ts";

const words: MissionWord[] = [
  { answer: "PASSPORT", clue: "a" },
  { answer: "GATE", clue: "b" },
  { answer: "VISA", clue: "c" },
  { answer: "LUGGAGE", clue: "d" },
];

test("normalizeAnswer keeps letters only, upper-cased", () => {
  assert.equal(normalizeAnswer("Wi-Fi 6"), "WIFI");
});

test("layout places every word and is deterministic", () => {
  const a = generateLayout(words);
  const b = generateLayout(words);
  assert.deepEqual(a, b);
  assert.equal(a.unplaced.length, 0);
  assert.equal(a.placements.length, words.length);
});

test("crossing cells agree and no two words run together", () => {
  const layout = generateLayout(words);
  const grid = solutionGrid(words, layout);
  // Every placed word reads correctly from the grid.
  for (const p of layout.placements) {
    let read = "";
    for (let i = 0; i < p.length; i++) {
      read += grid.get(p.direction === "across" ? `${p.row},${p.col + i}` : `${p.row + i},${p.col}`);
    }
    assert.equal(read, normalizeAnswer(words[p.wordIndex].answer));
    // The cells just before and after the word are empty.
    const before = p.direction === "across" ? `${p.row},${p.col - 1}` : `${p.row - 1},${p.col}`;
    const after = p.direction === "across" ? `${p.row},${p.col + p.length}` : `${p.row + p.length},${p.col}`;
    assert.ok(!grid.has(before) && !grid.has(after));
  }
});

test("public puzzle never contains answers", () => {
  const puzzle = toPublicPuzzle(words, generateLayout(words));
  const json = JSON.stringify(puzzle);
  for (const w of words) assert.ok(!json.includes(w.answer));
});

test("grading marks only fully correct words", () => {
  const layout = generateLayout(words);
  const entries = Object.fromEntries(solutionGrid(words, layout));
  assert.ok(gradeEntries(words, layout, entries).every((r) => r.correct));
  const first = layout.placements[0];
  const k = `${first.row},${first.col}`;
  entries[k] = entries[k] === "Z" ? "Y" : "Z";
  const res = gradeEntries(words, layout, entries);
  assert.equal(res[0].correct, false);
});

test("score rewards accuracy, penalises hints", () => {
  const base = { correctWords: 8, totalWords: 8, hintsUsed: 0, checksUsed: 0, durationSec: 60, timeLimit: 0 };
  const perfect = computeScore(base);
  assert.ok(perfect > 850 && perfect <= 1000);
  assert.ok(computeScore({ ...base, hintsUsed: 4 }) < perfect);
  assert.equal(computeScore({ ...base, correctWords: 0 }), 0);
  assert.equal(starsFor(perfect), 3);
});

test("every seed mission fits in a single grid", () => {
  const missions: Mission[] = JSON.parse(readFileSync(new URL("../data/seed/missions.json", import.meta.url), "utf8"));
  assert.ok(missions.length >= 10);
  for (const m of missions) {
    const layout = generateLayout(m.words);
    assert.deepEqual(layout.unplaced, [], `${m.id} has unplaced words`);
  }
});
