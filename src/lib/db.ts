import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Attempt, Category, Mission, User } from "./types";

/**
 * Tiny JSON-file database. Each collection lives in its own file under
 * DATA_DIR (default ./data/db). On first access the file is copied from
 * ./data/seed so a fresh checkout has content to play with.
 *
 * Writes are serialised per collection and done atomically (write temp file,
 * then rename) so a crash never leaves a half-written file behind.
 */

interface Collections {
  users: User;
  categories: Category;
  missions: Mission;
  attempts: Attempt;
}
type Name = keyof Collections;

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data", "db");
const SEED_DIR = path.join(process.cwd(), "data", "seed");

const locks = new Map<Name, Promise<unknown>>();

async function ensureFile(name: Name): Promise<string> {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    let seed = "[]\n";
    try {
      seed = await fs.readFile(path.join(SEED_DIR, `${name}.json`), "utf8");
    } catch {
      /* no seed for this collection */
    }
    await fs.writeFile(file, seed);
  }
  return file;
}

export async function readAll<N extends Name>(name: N): Promise<Collections[N][]> {
  const file = await ensureFile(name);
  return JSON.parse(await fs.readFile(file, "utf8")) as Collections[N][];
}

/** Read-modify-write a whole collection under a per-collection lock. */
export async function mutate<N extends Name, R>(
  name: N,
  fn: (rows: Collections[N][]) => R | Promise<R>,
): Promise<R> {
  const prev = locks.get(name) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(async () => {
    const rows = await readAll(name);
    const result = await fn(rows);
    const file = await ensureFile(name);
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(rows, null, 2) + "\n");
    await fs.rename(tmp, file);
    return result;
  });
  locks.set(name, run);
  return run;
}

export const newId = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

// ---------- typed helpers ----------

export async function getCategories() {
  return (await readAll("categories")).sort((a, b) => a.order - b.order);
}

export async function getCategoryBySlug(slug: string) {
  return (await readAll("categories")).find((c) => c.slug === slug) ?? null;
}

export async function getMissions(opts: { includeDrafts?: boolean } = {}) {
  const all = await readAll("missions");
  return opts.includeDrafts ? all : all.filter((m) => m.published);
}

export async function getMission(id: string) {
  return (await readAll("missions")).find((m) => m.id === id) ?? null;
}

export async function getUserByEmail(email: string) {
  const e = email.trim().toLowerCase();
  return (await readAll("users")).find((u) => u.email.toLowerCase() === e) ?? null;
}

export async function getUser(id: string) {
  return (await readAll("users")).find((u) => u.id === id) ?? null;
}

export async function getAttemptsForUser(userId: string) {
  return (await readAll("attempts"))
    .filter((a) => a.userId === userId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** Best completed score per mission for a user. */
export async function getBestScores(userId: string) {
  const best = new Map<string, number>();
  for (const a of await getAttemptsForUser(userId)) {
    if (a.status !== "completed") continue;
    best.set(a.missionId, Math.max(best.get(a.missionId) ?? 0, a.score));
  }
  return best;
}
