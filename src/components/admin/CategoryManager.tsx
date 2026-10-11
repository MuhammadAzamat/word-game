"use client";
import { Pencil, Plus, Trash } from "lucide-react";
import { useState } from "react";
import type { Category } from "@/lib/types";
import { ConfirmButton, Modal } from "./Modal";
import { useMutation } from "./useMutation";

type Row = Category & { missions: number };
const EMPTY = { name: "", slug: "", description: "", icon: "📚", color: "#6366f1", order: 0 };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CategoryManager({ rows }: { rows: Row[] }) {
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const { run, busy, error, fields, setError } = useMutation();
  const del = useMutation();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { id, ...body } = editing;
    const ok = await run(id ? `/api/admin/categories/${id}` : "/api/admin/categories", id ? "PUT" : "POST", body);
    if (ok) setEditing(null);
  }

  const set = (patch: Partial<Category>) => setEditing((e) => ({ ...e, ...patch }));

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => { setError(null); setEditing({ ...EMPTY, order: rows.length }); }}>
          <Plus className="size-4" /> New category
        </button>
      </div>
      {del.error && <p className="mb-3 rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">{del.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => (
          <div key={c.id} className="card relative overflow-hidden p-5">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: c.color }} />
            <div className="flex items-start gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl text-2xl" style={{ background: `${c.color}22` }}>
                {c.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{c.name}</div>
                <div className="font-mono text-xs muted">/{c.slug} · #{c.order}</div>
              </div>
              <div className="flex">
                <button className="btn-ghost size-9 p-0" onClick={() => { setError(null); setEditing(c); }} aria-label="Edit">
                  <Pencil className="size-4" />
                </button>
                <ConfirmButton
                  className="btn-ghost size-9 p-0 text-rose-500"
                  label="Delete"
                  message={`Delete category “${c.name}”?`}
                  onConfirm={() => del.run(`/api/admin/categories/${c.id}`, "DELETE")}
                >
                  <Trash className="size-4" />
                </ConfirmButton>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm muted">{c.description}</p>
            <div className="mt-3 text-xs font-semibold">{c.missions} missions</div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing.id ? "Edit category" : "New category"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div>
                <label className="label" htmlFor="icon">Icon</label>
                <input id="icon" className="input text-center text-xl" value={editing.icon ?? ""} onChange={(e) => set({ icon: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="name">Name</label>
                <input
                  id="name"
                  className="input"
                  value={editing.name ?? ""}
                  onChange={(e) => set({ name: e.target.value, ...(editing.id ? {} : { slug: slugify(e.target.value) }) })}
                  required
                />
                {fields.name && <p className="mt-1 text-xs text-rose-500">{fields.name}</p>}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="slug">URL slug</label>
              <input id="slug" className="input font-mono" value={editing.slug ?? ""} onChange={(e) => set({ slug: e.target.value })} required />
              {fields.slug && <p className="mt-1 text-xs text-rose-500">{fields.slug}</p>}
            </div>
            <div>
              <label className="label" htmlFor="desc">Description</label>
              <textarea id="desc" rows={3} className="input" value={editing.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="color">Colour</label>
                <div className="flex gap-2">
                  <input type="color" className="h-10 w-12 cursor-pointer rounded-xl border hairline bg-transparent" value={editing.color ?? "#6366f1"} onChange={(e) => set({ color: e.target.value })} aria-label="Pick colour" />
                  <input id="color" className="input font-mono" value={editing.color ?? ""} onChange={(e) => set({ color: e.target.value })} />
                </div>
                {fields.color && <p className="mt-1 text-xs text-rose-500">{fields.color}</p>}
              </div>
              <div>
                <label className="label" htmlFor="order">Order</label>
                <input id="order" type="number" min={0} className="input" value={editing.order ?? 0} onChange={(e) => set({ order: Number(e.target.value) })} />
              </div>
            </div>
            {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
