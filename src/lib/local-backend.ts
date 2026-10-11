// Browser-only backend for the static GitHub Pages build. Data lives in
// localStorage, seeded from data/seed on first visit.
import attemptsSeed from "../../data/seed/attempts.json";
import categoriesSeed from "../../data/seed/categories.json";
import missionsSeed from "../../data/seed/missions.json";
import usersSeed from "../../data/seed/users.json";
import { ApiError, runOperation, toPublicUser } from "./services";
import type { CollectionName, Collections, Store } from "./store";

const PREFIX = "wordquest:v1:";
const SESSION_KEY = `${PREFIX}session`;

const SEEDS: { [N in CollectionName]: Collections[N][] } = {
  users: usersSeed as Collections["users"][],
  categories: categoriesSeed as Collections["categories"][],
  missions: missionsSeed as Collections["missions"][],
  attempts: attemptsSeed as Collections["attempts"][],
};

const localStore: Store = {
  async read(name) {
    const raw = localStorage.getItem(PREFIX + name);
    return raw ? JSON.parse(raw) : structuredClone(SEEDS[name]);
  },
  async mutate(name, fn) {
    const rows = await localStore.read(name);
    const result = await fn(rows);
    localStorage.setItem(PREFIX + name, JSON.stringify(rows));
    return result;
  },
};

async function currentUser() {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const user = (await localStore.read("users")).find((u) => u.id === id);
  return user ? toPublicUser(user) : null;
}

export async function localCall(op: string, args: unknown) {
  if (op === "logout") {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const data = await runOperation(op, args, { store: localStore, user: await currentUser() });
  if (op === "login" || op === "register") localStorage.setItem(SESSION_KEY, (data as { id: string }).id);
  return data;
}

/** Wipes everything this browser stored and starts again from the seed data. */
export function resetLocalData() {
  for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
}

export { ApiError };
