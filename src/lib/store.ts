import type { Attempt, Category, Mission, User } from "./types";

export interface Collections {
  users: User;
  categories: Category;
  missions: Mission;
  attempts: Attempt;
}
export type CollectionName = keyof Collections;

/**
 * Storage used by the services. The server keeps JSON files on disk, the
 * static (GitHub Pages) build keeps the same JSON in localStorage.
 */
export interface Store {
  read<N extends CollectionName>(name: N): Promise<Collections[N][]>;
  /** Read-modify-write a whole collection; `fn` mutates `rows` in place. */
  mutate<N extends CollectionName, R>(name: N, fn: (rows: Collections[N][]) => R | Promise<R>): Promise<R>;
}

export const newId = (prefix: string) => `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
