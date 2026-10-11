export type Role = "user" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export type PublicUser = Omit<User, "passwordHash">;

/** What a mission mainly trains. Shown as a badge and used for filtering. */
export type Focus = "grammar" | "vocabulary" | "speaking" | "knowledge";

export type Difficulty = "easy" | "medium" | "hard";

/** CEFR level the mission is aimed at. */
export type Level = "A1" | "A2" | "B1" | "B2" | "C1";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  /** Tailwind-free hex colour used for gradients and accents. */
  color: string;
  order: number;
}

export interface MissionWord {
  /** Letters only, stored upper-case. */
  answer: string;
  clue: string;
  /** Grammar note, fun fact or explanation shown after solving. */
  note?: string;
  /** Example sentence used for reading and speaking practice. */
  example?: string;
}

export interface Mission {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  focus: Focus;
  difficulty: Difficulty;
  level: Level;
  /** Seconds. 0 means no time limit. */
  timeLimit: number;
  published: boolean;
  words: MissionWord[];
  createdAt: string;
  updatedAt: string;
}

export interface Attempt {
  id: string;
  userId: string;
  missionId: string;
  startedAt: string;
  finishedAt: string | null;
  status: "in_progress" | "completed" | "abandoned";
  hintsUsed: number;
  checksUsed: number;
  correctWords: number;
  totalWords: number;
  score: number;
  durationSec: number;
}

export type Direction = "across" | "down";

export interface Placement {
  wordIndex: number;
  row: number;
  col: number;
  direction: Direction;
  number: number;
  length: number;
}

export interface CrosswordLayout {
  rows: number;
  cols: number;
  placements: Placement[];
  /** Indexes of words that could not be fitted into the grid. */
  unplaced: number[];
}

/** Layout sent to players: no answers, only geometry and clues. */
export interface PublicPuzzle {
  rows: number;
  cols: number;
  /** Cell keys "r,c" that hold letters, with optional clue number. */
  cells: { r: number; c: number; n?: number }[];
  clues: {
    id: string;
    number: number;
    direction: Direction;
    row: number;
    col: number;
    length: number;
    clue: string;
  }[];
}
