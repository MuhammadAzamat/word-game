import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CollectionName, Collections, Store } from "./store";

/**
 * JSON-file store for the server build. Each collection lives in its own file
 * under DATA_DIR (default ./data/db), copied from ./data/seed on first access.
 * Writes are serialised per collection and atomic (temp file, then rename).
 */

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data", "db");
const SEED_DIR = path.join(process.cwd(), "data", "seed");

const locks = new Map<CollectionName, Promise<unknown>>();

async function ensureFile(name: CollectionName): Promise<string> {
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

async function read<N extends CollectionName>(name: N): Promise<Collections[N][]> {
  const file = await ensureFile(name);
  return JSON.parse(await fs.readFile(file, "utf8")) as Collections[N][];
}

export const fileStore: Store = {
  read,
  mutate(name, fn) {
    const prev = locks.get(name) ?? Promise.resolve();
    const run = prev.catch(() => {}).then(async () => {
      const rows = await read(name);
      const result = await fn(rows);
      const file = await ensureFile(name);
      const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(rows, null, 2) + "\n");
      await fs.rename(tmp, file);
      return result;
    });
    locks.set(name, run);
    return run;
  },
};
