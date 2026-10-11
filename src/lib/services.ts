import bcrypt from "bcryptjs";
import { z, type ZodType } from "zod";
import {
  computeScore,
  generateLayout,
  gradeEntries,
  normalizeAnswer,
  solutionGrid,
  starsFor,
  toPublicPuzzle,
} from "./crossword";
import {
  categorySchema,
  entriesSchema,
  loginSchema,
  missionSchema,
  registerSchema,
} from "./schemas";
import { newId, type Store } from "./store";
import type {
  Attempt,
  Category,
  Direction,
  Focus,
  Mission,
  PublicPuzzle,
  PublicUser,
  Role,
  User,
} from "./types";

/**
 * Every operation the app performs, independent of where it runs.
 * The server calls these from /api/rpc with a file store; the static
 * GitHub Pages build calls them in the browser with a localStorage store.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export interface Ctx {
  store: Store;
  user: PublicUser | null;
}

// ---------- helpers ----------

function parse<T>(schema: ZodType<T>, raw: unknown): T {
  const res = schema.safeParse(raw);
  if (res.success) return res.data;
  const fields: Record<string, string> = {};
  for (const issue of res.error.issues) {
    const k = issue.path.join(".");
    if (!fields[k]) fields[k] = issue.message;
  }
  throw new ApiError(422, res.error.issues[0]?.message ?? "Invalid input", fields);
}

function needUser(ctx: Ctx) {
  if (!ctx.user) throw new ApiError(401, "Sign in required");
  return ctx.user;
}

function needAdmin(ctx: Ctx) {
  const u = needUser(ctx);
  if (u.role !== "admin") throw new ApiError(403, "Admins only");
  return u;
}

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

function removeWhere<T>(rows: T[], pred: (r: T) => boolean) {
  for (let i = rows.length - 1; i >= 0; i--) if (pred(rows[i])) rows.splice(i, 1);
}

async function bestScores(store: Store, userId: string | null) {
  const best = new Map<string, number>();
  if (!userId) return best;
  for (const a of await store.read("attempts")) {
    if (a.userId !== userId || a.status !== "completed") continue;
    best.set(a.missionId, Math.max(best.get(a.missionId) ?? 0, a.score));
  }
  return best;
}

const sortedCategories = async (store: Store) => (await store.read("categories")).sort((a, b) => a.order - b.order);

// ---------- shapes returned to the UI ----------

export interface MissionSummary {
  mission: Pick<Mission, "id" | "title" | "description" | "focus" | "difficulty" | "level" | "timeLimit"> & {
    wordCount: number;
  };
  category: Pick<Category, "name" | "icon" | "color" | "slug">;
  best: number | null;
}

export interface ReviewItem {
  clueId: string;
  number: number;
  direction: Direction;
  clue: string;
  answer: string;
  note: string;
  example: string;
  correct: boolean;
}

// ---------- auth ----------

async function login(ctx: Ctx, raw: unknown) {
  const { email, password } = parse(loginSchema, raw);
  const user = (await ctx.store.read("users")).find((u) => u.email.toLowerCase() === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(401, "Wrong email or password");
  return toPublicUser(user);
}

async function register(ctx: Ctx, raw: unknown) {
  const { name, email, password } = parse(registerSchema, raw);
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await ctx.store.mutate("users", (rows) => {
    if (rows.some((u) => u.email.toLowerCase() === email)) return null;
    const u: User = { id: newId("u"), name, email, passwordHash, role: "user", createdAt: new Date().toISOString() };
    rows.push(u);
    return u;
  });
  if (!user) throw new ApiError(409, "An account with this email already exists", { email: "Already registered" });
  return toPublicUser(user);
}

// ---------- player ----------

async function catalog(ctx: Ctx, raw: unknown) {
  const { slug } = parse(z.object({ slug: z.string().optional() }), raw ?? {});
  const [categories, missions, best] = await Promise.all([
    sortedCategories(ctx.store),
    ctx.store.read("missions"),
    bestScores(ctx.store, ctx.user?.id ?? null),
  ]);
  const category = slug ? categories.find((c) => c.slug === slug) ?? null : null;
  if (slug && !category) throw new ApiError(404, "Category not found");

  const byId = new Map(categories.map((c) => [c.id, c]));
  const order = new Map(categories.map((c, i) => [c.id, i]));
  const items: MissionSummary[] = missions
    .filter((m) => m.published && byId.has(m.categoryId) && (!category || m.categoryId === category.id))
    .sort((a, b) => order.get(a.categoryId)! - order.get(b.categoryId)! || a.createdAt.localeCompare(b.createdAt))
    .map((m) => {
      const c = byId.get(m.categoryId)!;
      return {
        mission: {
          id: m.id,
          title: m.title,
          description: m.description,
          focus: m.focus,
          difficulty: m.difficulty,
          level: m.level,
          timeLimit: m.timeLimit,
          wordCount: m.words.length,
        },
        category: { name: c.name, icon: c.icon, color: c.color, slug: c.slug },
        best: best.get(m.id) ?? null,
      };
    });

  const counts: Record<string, number> = {};
  for (const m of missions) if (m.published) counts[m.categoryId] = (counts[m.categoryId] ?? 0) + 1;
  const scores = [...best.values()];
  return {
    categories: categories.map((c) => ({ ...c, missions: counts[c.id] ?? 0 })),
    category,
    items,
    completed: best.size,
    stars: scores.reduce((s, v) => s + starsFor(v), 0),
    bestTotal: scores.reduce((s, v) => s + v, 0),
  };
}

async function playData(ctx: Ctx, raw: unknown) {
  const user = needUser(ctx);
  const { id } = parse(z.object({ id: z.string() }), raw);
  const missions = await ctx.store.read("missions");
  const mission = missions.find((m) => m.id === id);
  if (!mission || (!mission.published && user.role !== "admin")) throw new ApiError(404, "Mission not found");
  const category = (await ctx.store.read("categories")).find((c) => c.id === mission.categoryId);
  if (!category) throw new ApiError(404, "Mission not found");

  const puzzle: PublicPuzzle = toPublicPuzzle(mission.words, generateLayout(mission.words));
  const siblings = missions
    .filter((m) => m.published && m.categoryId === mission.categoryId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const next = siblings[siblings.findIndex((m) => m.id === mission.id) + 1] ?? null;
  return {
    mission: { id: mission.id, title: mission.title, timeLimit: mission.timeLimit },
    category: { name: category.name, icon: category.icon, color: category.color, slug: category.slug },
    puzzle,
    nextMission: next ? { id: next.id, title: next.title } : null,
  };
}

async function startAttempt(ctx: Ctx, raw: unknown) {
  const user = needUser(ctx);
  const { missionId } = parse(z.object({ missionId: z.string() }), raw);
  const mission = (await ctx.store.read("missions")).find((m) => m.id === missionId);
  if (!mission || (!mission.published && user.role !== "admin")) throw new ApiError(404, "Mission not found");
  const layout = generateLayout(mission.words);

  const attempt = await ctx.store.mutate("attempts", (rows) => {
    // Only one open attempt per mission: older unfinished ones are abandoned.
    for (const a of rows) {
      if (a.userId === user.id && a.missionId === mission.id && a.status === "in_progress") {
        a.status = "abandoned";
        a.finishedAt = new Date().toISOString();
      }
    }
    const a: Attempt = {
      id: newId("a"),
      userId: user.id,
      missionId: mission.id,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      status: "in_progress",
      hintsUsed: 0,
      checksUsed: 0,
      correctWords: 0,
      totalWords: layout.placements.length,
      score: 0,
      durationSec: 0,
    };
    rows.push(a);
    return a;
  });
  return { attemptId: attempt.id, startedAt: attempt.startedAt };
}

/** Loads an in-progress attempt that belongs to the user, with its mission and grid. */
async function activeAttempt(ctx: Ctx, attemptId: string) {
  const user = needUser(ctx);
  const attempt = (await ctx.store.read("attempts")).find((a) => a.id === attemptId);
  if (!attempt || attempt.userId !== user.id) throw new ApiError(404, "Attempt not found");
  if (attempt.status !== "in_progress") throw new ApiError(409, "This attempt is already finished");
  const mission = (await ctx.store.read("missions")).find((m) => m.id === attempt.missionId);
  if (!mission) throw new ApiError(404, "Mission no longer exists");
  return { attempt, mission, layout: generateLayout(mission.words) };
}

async function hint(ctx: Ctx, raw: unknown) {
  const { attemptId, cell } = parse(z.object({ attemptId: z.string(), cell: z.string().regex(/^\d+,\d+$/) }), raw);
  const { mission, layout } = await activeAttempt(ctx, attemptId);
  const letter = solutionGrid(mission.words, layout).get(cell);
  if (!letter) throw new ApiError(400, "That cell is not part of the puzzle");
  const hintsUsed = await ctx.store.mutate("attempts", (rows) => {
    const a = rows.find((r) => r.id === attemptId)!;
    a.hintsUsed += 1;
    return a.hintsUsed;
  });
  return { letter, hintsUsed };
}

/** Returns the filled cells that are wrong, without revealing the right letters. */
async function check(ctx: Ctx, raw: unknown) {
  const { attemptId, entries } = parse(entriesSchema.extend({ attemptId: z.string() }), raw);
  const { mission, layout } = await activeAttempt(ctx, attemptId);
  const solution = solutionGrid(mission.words, layout);
  const wrong = Object.entries(entries)
    .filter(([cell, letter]) => letter && solution.has(cell) && solution.get(cell) !== letter.toUpperCase())
    .map(([cell]) => cell);
  const checksUsed = await ctx.store.mutate("attempts", (rows) => {
    const a = rows.find((r) => r.id === attemptId)!;
    a.checksUsed += 1;
    return a.checksUsed;
  });
  return { wrong, checksUsed };
}

async function submit(ctx: Ctx, raw: unknown) {
  const { attemptId, entries } = parse(entriesSchema.extend({ attemptId: z.string() }), raw);
  const { mission, layout } = await activeAttempt(ctx, attemptId);
  const results = gradeEntries(mission.words, layout, entries);
  const correctWords = results.filter((r) => r.correct).length;
  const finishedAt = new Date();

  const attempt = await ctx.store.mutate("attempts", (rows) => {
    const a = rows.find((r) => r.id === attemptId)!;
    a.durationSec = Math.max(1, Math.round((finishedAt.getTime() - Date.parse(a.startedAt)) / 1000));
    a.correctWords = correctWords;
    a.totalWords = results.length;
    a.score = computeScore({
      correctWords,
      totalWords: results.length,
      hintsUsed: a.hintsUsed,
      checksUsed: a.checksUsed,
      durationSec: a.durationSec,
      timeLimit: mission.timeLimit,
    });
    a.status = "completed";
    a.finishedAt = finishedAt.toISOString();
    return { ...a };
  });

  const review: ReviewItem[] = layout.placements.map((p, i) => {
    const w = mission.words[p.wordIndex];
    return {
      clueId: results[i].clueId,
      number: p.number,
      direction: p.direction,
      clue: w.clue,
      answer: normalizeAnswer(w.answer),
      note: w.note ?? "",
      example: w.example ?? "",
      correct: results[i].correct,
    };
  });
  return { attempt, stars: starsFor(attempt.score), review };
}

/** Consecutive days (ending today or yesterday) with at least one completed mission. */
function streak(dates: string[]) {
  const days = new Set(dates.map((d) => d.slice(0, 10)));
  const day = new Date();
  if (!days.has(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() - 1);
  let n = 0;
  while (days.has(day.toISOString().slice(0, 10))) {
    n++;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return n;
}

async function profile(ctx: Ctx) {
  const user = needUser(ctx);
  const [attempts, missions, categories, best] = await Promise.all([
    ctx.store.read("attempts"),
    ctx.store.read("missions"),
    ctx.store.read("categories"),
    bestScores(ctx.store, user.id),
  ]);
  const missionById = new Map(missions.map((m) => [m.id, m]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const completed = attempts
    .filter((a) => a.userId === user.id && a.status === "completed")
    .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""));

  const focuses: Focus[] = ["grammar", "vocabulary", "speaking", "knowledge"];
  return {
    user,
    completed: best.size,
    stars: [...best.values()].reduce((s, v) => s + starsFor(v), 0),
    wordsSolved: completed.reduce((s, a) => s + a.correctWords, 0),
    streak: streak(completed.map((a) => a.finishedAt!)),
    skills: focuses.map((f) => {
      const pool = missions.filter((m) => m.published && m.focus === f);
      return { focus: f, done: pool.filter((m) => best.has(m.id)).length, total: pool.length };
    }),
    recent: completed.slice(0, 25).map((a) => {
      const m = missionById.get(a.missionId);
      return {
        ...a,
        missionTitle: m?.title ?? "Deleted mission",
        icon: (m && catById.get(m.categoryId)?.icon) ?? "🧩",
      };
    }),
  };
}

// ---------- admin ----------

async function adminDashboard(ctx: Ctx) {
  needAdmin(ctx);
  const [users, missions, categories, attempts] = await Promise.all([
    ctx.store.read("users"),
    ctx.store.read("missions"),
    ctx.store.read("categories"),
    ctx.store.read("attempts"),
  ]);
  const completed = attempts.filter((a) => a.status === "completed");
  const userById = new Map(users.map((u) => [u.id, u.name]));
  const missionById = new Map(missions.map((m) => [m.id, m.title]));

  const plays = new Map<string, { n: number; total: number }>();
  for (const a of completed) {
    const p = plays.get(a.missionId) ?? { n: 0, total: 0 };
    plays.set(a.missionId, { n: p.n + 1, total: p.total + a.score });
  }
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, n: completed.filter((a) => a.finishedAt?.startsWith(key)).length };
  });

  return {
    users: users.length,
    published: missions.filter((m) => m.published).length,
    drafts: missions.filter((m) => !m.published).length,
    categories: categories.length,
    completed: completed.length,
    avgScore: completed.length ? Math.round(completed.reduce((s, a) => s + a.score, 0) / completed.length) : 0,
    days,
    top: [...plays.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 6)
      .map(([id, p]) => ({ id, title: missionById.get(id) ?? id, plays: p.n, avg: Math.round(p.total / p.n) })),
    latest: completed
      .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""))
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        user: userById.get(a.userId) ?? "Deleted user",
        mission: missionById.get(a.missionId) ?? "Deleted mission",
        score: a.score,
        finishedAt: a.finishedAt!,
      })),
  };
}

async function adminMissions(ctx: Ctx) {
  needAdmin(ctx);
  const [missions, categories, attempts] = await Promise.all([
    ctx.store.read("missions"),
    sortedCategories(ctx.store),
    ctx.store.read("attempts"),
  ]);
  const order = new Map(categories.map((c, i) => [c.id, i]));
  const rows = missions
    .sort((a, b) => (order.get(a.categoryId) ?? 99) - (order.get(b.categoryId) ?? 99) || a.title.localeCompare(b.title))
    .map((m) => ({
      id: m.id,
      title: m.title,
      categoryId: m.categoryId,
      focus: m.focus,
      difficulty: m.difficulty,
      level: m.level,
      published: m.published,
      updatedAt: m.updatedAt,
      words: m.words.length,
      plays: attempts.filter((a) => a.missionId === m.id && a.status === "completed").length,
    }));
  return { rows, categories };
}

async function adminMission(ctx: Ctx, raw: unknown) {
  needAdmin(ctx);
  const { id } = parse(z.object({ id: z.string().optional() }), raw ?? {});
  const categories = await sortedCategories(ctx.store);
  if (!id) return { mission: null, categories };
  const mission = (await ctx.store.read("missions")).find((m) => m.id === id);
  if (!mission) throw new ApiError(404, "Mission not found");
  return { mission, categories };
}

async function saveMission(ctx: Ctx, raw: unknown) {
  needAdmin(ctx);
  const { id, data: rawData } = parse(z.object({ id: z.string().optional(), data: z.unknown() }), raw);
  const data = parse(missionSchema, rawData);
  if (!(await ctx.store.read("categories")).some((c) => c.id === data.categoryId)) {
    throw new ApiError(422, "Unknown category", { categoryId: "Unknown category" });
  }
  if (data.published && generateLayout(data.words).unplaced.length) {
    throw new ApiError(422, "Some words don't fit the grid. Change them or save as a draft.");
  }
  const now = new Date().toISOString();
  if (!id) {
    const mission: Mission = { id: newId("m"), ...data, createdAt: now, updatedAt: now };
    await ctx.store.mutate("missions", (rows) => void rows.push(mission));
    return mission;
  }
  const updated = await ctx.store.mutate("missions", (rows) => {
    const m = rows.find((r) => r.id === id);
    if (!m) return null;
    Object.assign(m, data, { updatedAt: now });
    return m;
  });
  if (!updated) throw new ApiError(404, "Mission not found");
  return updated;
}

async function publishMission(ctx: Ctx, raw: unknown) {
  needAdmin(ctx);
  const { id, published } = parse(z.object({ id: z.string(), published: z.boolean() }), raw);
  const result = await ctx.store.mutate("missions", (rows) => {
    const m = rows.find((r) => r.id === id);
    if (!m) return "missing" as const;
    if (published && generateLayout(m.words).unplaced.length) return "unfit" as const;
    m.published = published;
    m.updatedAt = new Date().toISOString();
    return m;
  });
  if (result === "missing") throw new ApiError(404, "Mission not found");
  if (result === "unfit") throw new ApiError(422, "Some words don't fit the grid yet");
  return result;
}

async function deleteMission(ctx: Ctx, raw: unknown) {
  needAdmin(ctx);
  const { id } = parse(z.object({ id: z.string() }), raw);
  const removed = await ctx.store.mutate("missions", (rows) => {
    const before = rows.length;
    removeWhere(rows, (r) => r.id === id);
    return rows.length < before;
  });
  if (!removed) throw new ApiError(404, "Mission not found");
  await ctx.store.mutate("attempts", (rows) => removeWhere(rows, (r) => r.missionId === id));
  return { ok: true };
}

/** Live grid preview for the mission editor. Tolerates half-typed words. */
async function preview(ctx: Ctx, raw: unknown) {
  needAdmin(ctx);
  const { words } = parse(z.object({ words: z.array(z.object({ answer: z.string() })).max(30) }), raw);
  const list = words.map((w) => ({ answer: w.answer, clue: "" }));
  const layout = generateLayout(list);
  return { layout, solution: Object.fromEntries(solutionGrid(list, layout)) };
}

async function adminCategories(ctx: Ctx) {
  needAdmin(ctx);
  const [categories, missions] = await Promise.all([sortedCategories(ctx.store), ctx.store.read("missions")]);
  return categories.map((c) => ({ ...c, missions: missions.filter((m) => m.categoryId === c.id).length }));
}

async function saveCategory(ctx: Ctx, raw: unknown) {
  needAdmin(ctx);
  const { id, data: rawData } = parse(z.object({ id: z.string().optional(), data: z.unknown() }), raw);
  const data = parse(categorySchema, rawData);
  const result = await ctx.store.mutate("categories", (rows) => {
    if (rows.some((r) => r.id !== id && r.slug === data.slug)) return "slug" as const;
    if (!id) {
      const c: Category = { id: newId("cat"), ...data };
      rows.push(c);
      return c;
    }
    const c = rows.find((r) => r.id === id);
    if (!c) return "missing" as const;
    Object.assign(c, data);
    return c;
  });
  if (result === "slug") throw new ApiError(409, "Slug already in use", { slug: "Already in use" });
  if (result === "missing") throw new ApiError(404, "Category not found");
  return result;
}

async function deleteCategory(ctx: Ctx, raw: unknown) {
  needAdmin(ctx);
  const { id } = parse(z.object({ id: z.string() }), raw);
  const inUse = (await ctx.store.read("missions")).filter((m) => m.categoryId === id).length;
  if (inUse) throw new ApiError(409, `Move or delete its ${inUse} mission(s) first`);
  const removed = await ctx.store.mutate("categories", (rows) => {
    const before = rows.length;
    removeWhere(rows, (r) => r.id === id);
    return rows.length < before;
  });
  if (!removed) throw new ApiError(404, "Category not found");
  return { ok: true };
}

async function adminAttempts(ctx: Ctx) {
  needAdmin(ctx);
  const [attempts, users, missions] = await Promise.all([
    ctx.store.read("attempts"),
    ctx.store.read("users"),
    ctx.store.read("missions"),
  ]);
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const missionTitle = new Map(missions.map((m) => [m.id, m.title]));
  return attempts
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((a) => ({
      ...a,
      userName: userName.get(a.userId) ?? "Deleted user",
      missionTitle: missionTitle.get(a.missionId) ?? "Deleted mission",
    }));
}

async function deleteAttempt(ctx: Ctx, raw: unknown) {
  needAdmin(ctx);
  const { id } = parse(z.object({ id: z.string() }), raw);
  const removed = await ctx.store.mutate("attempts", (rows) => {
    const before = rows.length;
    removeWhere(rows, (r) => r.id === id);
    return rows.length < before;
  });
  if (!removed) throw new ApiError(404, "Attempt not found");
  return { ok: true };
}

async function adminUsers(ctx: Ctx) {
  const me = needAdmin(ctx);
  const [users, attempts] = await Promise.all([ctx.store.read("users"), ctx.store.read("attempts")]);
  const rows = users
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((u) => ({
      ...toPublicUser(u),
      attempts: attempts.filter((a) => a.userId === u.id && a.status === "completed").length,
    }));
  return { rows, meId: me.id };
}

async function setRole(ctx: Ctx, raw: unknown) {
  const me = needAdmin(ctx);
  const { id, role } = parse(z.object({ id: z.string(), role: z.enum(["user", "admin"]) }), raw);
  if (id === me.id) throw new ApiError(400, "You can't change your own role");
  const found = await ctx.store.mutate("users", (rows) => {
    const u = rows.find((r) => r.id === id);
    if (u) u.role = role as Role;
    return !!u;
  });
  if (!found) throw new ApiError(404, "User not found");
  return { ok: true };
}

async function deleteUser(ctx: Ctx, raw: unknown) {
  const me = needAdmin(ctx);
  const { id } = parse(z.object({ id: z.string() }), raw);
  if (id === me.id) throw new ApiError(400, "You can't delete yourself");
  const removed = await ctx.store.mutate("users", (rows) => {
    const before = rows.length;
    removeWhere(rows, (r) => r.id === id);
    return rows.length < before;
  });
  if (!removed) throw new ApiError(404, "User not found");
  await ctx.store.mutate("attempts", (rows) => removeWhere(rows, (r) => r.userId === id));
  return { ok: true };
}

// ---------- registry ----------

export const operations = {
  me: async (ctx: Ctx) => ctx.user,
  login,
  register,
  catalog,
  play: playData,
  "attempt.start": startAttempt,
  "attempt.hint": hint,
  "attempt.check": check,
  "attempt.submit": submit,
  profile,
  "admin.dashboard": adminDashboard,
  "admin.missions": adminMissions,
  "admin.mission": adminMission,
  "admin.mission.save": saveMission,
  "admin.mission.publish": publishMission,
  "admin.mission.delete": deleteMission,
  "admin.preview": preview,
  "admin.categories": adminCategories,
  "admin.category.save": saveCategory,
  "admin.category.delete": deleteCategory,
  "admin.attempts": adminAttempts,
  "admin.attempt.delete": deleteAttempt,
  "admin.users": adminUsers,
  "admin.user.role": setRole,
  "admin.user.delete": deleteUser,
} satisfies Record<string, (ctx: Ctx, args: unknown) => Promise<unknown>>;

export type Operations = typeof operations;
export type OpName = keyof Operations;
export type OpResult<O extends OpName> = Awaited<ReturnType<Operations[O]>>;

export async function runOperation(op: string, args: unknown, ctx: Ctx) {
  if (!Object.hasOwn(operations, op)) throw new ApiError(404, `Unknown operation: ${op}`);
  return (operations[op as OpName] as (ctx: Ctx, args: unknown) => Promise<unknown>)(ctx, args);
}
