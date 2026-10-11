"use client";
import { Pencil, Play, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DIFFICULTY, FOCUS } from "@/lib/labels";
import type { Category, Mission } from "@/lib/types";
import { ConfirmButton } from "./Modal";
import { useMutation } from "./useMutation";

type Row = Pick<Mission, "id" | "title" | "categoryId" | "focus" | "difficulty" | "level" | "published" | "updatedAt"> & {
  words: number;
  plays: number;
};

export function MissionTable({ rows, categories }: { rows: Row[]; categories: Category[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const { run, error } = useMutation();
  const catById = new Map(categories.map((c) => [c.id, c]));

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (cat === "all" || r.categoryId === cat) && (!t || r.title.toLowerCase().includes(t)));
  }, [rows, q, cat]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input className="input sm:max-w-xs" placeholder="Search missions…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:w-52" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <Link href="/admin/missions/new" className="btn-primary sm:ml-auto">
          <Plus className="size-4" /> New mission
        </Link>
      </div>
      {error && <p className="mb-3 rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide muted">
              <th className="p-4 font-semibold">Mission</th>
              <th className="p-4 font-semibold">Focus</th>
              <th className="p-4 font-semibold">Level</th>
              <th className="p-4 font-semibold">Words</th>
              <th className="p-4 font-semibold">Plays</th>
              <th className="p-4 font-semibold">Published</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => {
              const c = catById.get(m.categoryId);
              return (
                <tr key={m.id} className="border-t hairline">
                  <td className="p-4">
                    <Link href={`/admin/missions/${m.id}`} className="font-medium hover:text-brand-500">
                      {m.title}
                    </Link>
                    <div className="text-xs muted">
                      {c ? `${c.icon} ${c.name}` : "No category"}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`chip ${FOCUS[m.focus].className}`}>{FOCUS[m.focus].label}</span>
                  </td>
                  <td className="p-4">
                    {m.level} · <span className={DIFFICULTY[m.difficulty].className}>{DIFFICULTY[m.difficulty].label}</span>
                  </td>
                  <td className="p-4">{m.words}</td>
                  <td className="p-4">{m.plays}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={m.published}
                      aria-label={m.published ? "Unpublish" : "Publish"}
                      onClick={() => run(`/api/admin/missions/${m.id}`, "PATCH", { published: !m.published })}
                      className={`relative h-6 w-11 rounded-full transition ${m.published ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
                    >
                      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${m.published ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end">
                      <Link href={`/play/${m.id}`} className="btn-ghost size-9 p-0" aria-label="Play" title="Play">
                        <Play className="size-4" />
                      </Link>
                      <Link href={`/admin/missions/${m.id}`} className="btn-ghost size-9 p-0" aria-label="Edit" title="Edit">
                        <Pencil className="size-4" />
                      </Link>
                      <ConfirmButton
                        className="btn-ghost size-9 p-0 text-rose-500"
                        label="Delete mission"
                        message={`Delete “${m.title}” and all its attempts?`}
                        onConfirm={() => run(`/api/admin/missions/${m.id}`, "DELETE")}
                      >
                        <Trash className="size-4" />
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center muted">No missions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
