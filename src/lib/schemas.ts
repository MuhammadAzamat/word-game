import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(40),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(40),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  description: z.string().trim().max(200).default(""),
  icon: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #0ea5e9"),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

export const wordSchema = z.object({
  answer: z
    .string()
    .transform((s) => s.toUpperCase().replace(/[^A-Z]/g, ""))
    .pipe(z.string().min(2, "Answers need at least 2 letters").max(15, "Answers can have at most 15 letters")),
  clue: z.string().trim().min(3, "Every word needs a clue").max(200),
  note: z.string().trim().max(300).optional().default(""),
  example: z.string().trim().max(200).optional().default(""),
});

export const missionSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  title: z.string().trim().min(3).max(60),
  description: z.string().trim().max(200).default(""),
  focus: z.enum(["grammar", "vocabulary", "speaking", "knowledge"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  timeLimit: z.coerce.number().int().min(0).max(3600).default(0),
  published: z.boolean().default(false),
  words: z.array(wordSchema).min(3, "Add at least 3 words").max(20, "At most 20 words"),
});

export const entriesSchema = z.object({
  entries: z.record(z.string().regex(/^\d+,\d+$/), z.string().max(1)),
});
