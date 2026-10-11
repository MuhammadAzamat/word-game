"use client";
import { AlertTriangle, ArrowDown, ArrowUp, ClipboardPaste, Loader2, Plus, Save, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DIFFICULTY, FOCUS } from "@/lib/labels";
import type { Category, CrosswordLayout, Difficulty, Focus, Level, Mission, MissionWord } from "@/lib/types";
import { Modal } from "./Modal";
import { useMutation } from "./useMutation";

type Draft = Omit<Mission, "id" | "createdAt" | "updatedAt">;
const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];
const blankWord = (): MissionWord => ({ answer: "", clue: "", note: "", example: "" });

export function MissionEditor({ categories, mission }: { categories: Category[]; mission?: Mission }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(() =>
    mission
      ? { ...mission, words: mission.words.map((w) => ({ note: "", example: "", ...w })) }
      : {
          categoryId: categories[0]?.id ?? "",
          title: "",
          description: "",
          focus: "vocabulary",
          difficulty: "easy",
          level: "A2",
          timeLimit: 0,
          published: false,
          words: [blankWord(), blankWord(), blankWord()],
        },
  );
  const [preview, setPreview] = useState<{ layout: CrosswordLayout; solution: Record<string, string> } | null>(null);
  const [importing, setImporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const { run, busy, error, fields } = useMutation();

  const set = (patch: Partial<Draft>) => { setD((x) => ({ ...x, ...patch })); setSaved(false); };
  const setWord = (i: number, patch: Partial<MissionWord>) =>
    set({ words: d.words.map((w, j) => (j === i ? { ...w, ...patch } : w)) });
  const moveWord = (i: number, delta: number) => {
    const words = [...d.words];
    const [w] = words.splice(i, 1);
    words.splice(i + delta, 0, w);
    set({ words });
  };

  // Debounced live grid preview.
  const answersKey = d.words.map((w) => w.answer).join("|");
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch("/api/admin/missions/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ words: d.words.map((w) => ({ answer: w.answer })) }),
      });
      if (res.ok) setPreview(await res.json());
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answersKey]);

  const unplaced = new Set(preview?.layout.unplaced ?? []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await run<Mission>(mission ? `/api/admin/missions/${mission.id}` : "/api/admin/missions", mission ? "PUT" : "POST", d);
    if (!res) return;
    setSaved(true);
    if (!mission) router.push(`/admin/missions/${res.id}`);
  }

  const wordError = (i: number, f: string) => fields[`words.${i}.${f}`];

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="title">Title</label>
              <input id="title" className="input" value={d.title} onChange={(e) => set({ title: e.target.value })} required />
              {fields.title && <p className="mt-1 text-xs text-rose-500">{fields.title}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">Description</label>
              <textarea id="description" rows={2} className="input" value={d.description} onChange={(e) => set({ description: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select id="category" className="input" value={d.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="focus">Learning focus</label>
              <select id="focus" className="input" value={d.focus} onChange={(e) => set({ focus: e.target.value as Focus })}>
                {(Object.keys(FOCUS) as Focus[]).map((f) => (
                  <option key={f} value={f}>{FOCUS[f].emoji} {FOCUS[f].label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="level">Level</label>
                <select id="level" className="input" value={d.level} onChange={(e) => set({ level: e.target.value as Level })}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="difficulty">Difficulty</label>
                <select id="difficulty" className="input" value={d.difficulty} onChange={(e) => set({ difficulty: e.target.value as Difficulty })}>
                  {(Object.keys(DIFFICULTY) as Difficulty[]).map((x) => <option key={x} value={x}>{DIFFICULTY[x].label}</option>)}
                </select>
              </div>
              <div>
              <label className="label" htmlFor="time">Time limit (min, 0 = none)</label>
              <input
                id="time"
                type="number"
                min={0}
                max={60}
                className="input"
                value={Math.round(d.timeLimit / 60)}
                onChange={(e) => set({ timeLimit: Math.max(0, Number(e.target.value)) * 60 })}
              />
              </div>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold">Words & clues</h2>
            <span className="chip bg-black/5 dark:bg-white/10">{d.words.length}</span>
            <button type="button" className="btn-ghost ml-auto" onClick={() => setImporting(true)}>
              <ClipboardPaste className="size-4" /> Bulk import
            </button>
          </div>
          {fields.words && <p className="mb-3 text-sm text-rose-500">{fields.words}</p>}
          <ol className="space-y-3">
            {d.words.map((w, i) => (
              <li key={i} className={`rounded-2xl border p-4 ${unplaced.has(i) && w.answer ? "border-amber-500/60 bg-amber-500/5" : "hairline"}`}>
                <div className="flex items-start gap-3">
                  <span className="mt-2.5 w-5 text-right text-xs font-bold muted">{i + 1}</span>
                  <div className="grid min-w-0 flex-1 gap-2 2xl:grid-cols-[180px_1fr]">
                    <div>
                      <input
                        className="input font-display font-bold uppercase tracking-widest"
                        placeholder="ANSWER"
                        value={w.answer}
                        onChange={(e) => setWord(i, { answer: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })}
                        aria-label={`Answer ${i + 1}`}
                      />
                      {wordError(i, "answer") && <p className="mt-1 text-xs text-rose-500">{wordError(i, "answer")}</p>}
                      {unplaced.has(i) && w.answer.length >= 2 && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3" /> Doesn&apos;t fit the grid
                        </p>
                      )}
                    </div>
                    <div>
                      <input className="input" placeholder="Clue shown to players" value={w.clue} onChange={(e) => setWord(i, { clue: e.target.value })} aria-label={`Clue ${i + 1}`} />
                      {wordError(i, "clue") && <p className="mt-1 text-xs text-rose-500">{wordError(i, "clue")}</p>}
                    </div>
                    <input className="input text-xs 2xl:col-span-2" placeholder="Note: grammar tip or fun fact shown after solving (optional)" value={w.note ?? ""} onChange={(e) => setWord(i, { note: e.target.value })} aria-label={`Note ${i + 1}`} />
                    <input className="input text-xs italic 2xl:col-span-2" placeholder="Example sentence for listening & speaking (optional)" value={w.example ?? ""} onChange={(e) => setWord(i, { example: e.target.value })} aria-label={`Example ${i + 1}`} />
                  </div>
                  <div className="flex flex-col">
                    <button type="button" className="btn-ghost size-8 p-0" disabled={i === 0} onClick={() => moveWord(i, -1)} aria-label="Move up"><ArrowUp className="size-4" /></button>
                    <button type="button" className="btn-ghost size-8 p-0" disabled={i === d.words.length - 1} onClick={() => moveWord(i, 1)} aria-label="Move down"><ArrowDown className="size-4" /></button>
                    <button type="button" className="btn-ghost size-8 p-0 text-rose-500" onClick={() => set({ words: d.words.filter((_, j) => j !== i) })} aria-label="Remove word"><Trash className="size-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="btn-outline mt-4 w-full border-dashed" onClick={() => set({ words: [...d.words, blankWord()] })} disabled={d.words.length >= 20}>
            <Plus className="size-4" /> Add word
          </button>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Grid preview</h2>
            {preview && <span className="text-xs muted">{preview.layout.rows}×{preview.layout.cols}</span>}
          </div>
          <GridPreview preview={preview} />
          {unplaced.size > 0 && d.words.some((w, i) => unplaced.has(i) && w.answer.length >= 2) && (
            <p className="mt-3 flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-4 shrink-0" />
              Some words share no letters with the rest. Change them or add linking words before publishing.
            </p>
          )}
        </section>
        <section className="card space-y-4 p-5">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold">Published</span>
              <span className="text-xs muted">Visible to players on the home page</span>
            </span>
            <input type="checkbox" className="size-5 accent-emerald-500" checked={d.published} onChange={(e) => set({ published: e.target.checked })} />
          </label>
          {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">{error}</p>}
          {saved && !error && <p className="rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-300">Saved ✓</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => router.push("/admin/missions")}>Back</button>
            <button className="btn-primary flex-1" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
            </button>
          </div>
        </section>
      </aside>

      {importing && (
        <BulkImport
          onClose={() => setImporting(false)}
          onImport={(words, replace) => {
            set({ words: replace ? words : [...d.words.filter((w) => w.answer || w.clue), ...words] });
            setImporting(false);
          }}
        />
      )}
    </form>
  );
}

function GridPreview({ preview }: { preview: { layout: CrosswordLayout; solution: Record<string, string> } | null }) {
  if (!preview || preview.layout.placements.length === 0)
    return <div className="flex aspect-square items-center justify-center rounded-2xl border border-dashed hairline text-sm muted">Type some answers…</div>;
  const { layout, solution } = preview;
  const numbers = new Map(layout.placements.map((p) => [`${p.row},${p.col}`, p.number]));
  const size = `min(1.6rem, calc(340px / ${Math.max(layout.cols, 1)}))`;
  return (
    <div className="overflow-auto">
      <div className="mx-auto grid w-fit gap-[2px]" style={{ gridTemplateColumns: `repeat(${layout.cols}, ${size})`, gridAutoRows: size }}>
        {Array.from({ length: layout.rows * layout.cols }, (_, i) => {
          const key = `${Math.floor(i / layout.cols)},${i % layout.cols}`;
          const letter = solution[key];
          if (!letter) return <div key={key} />;
          return (
            <div key={key} className="relative flex items-center justify-center rounded-[3px] border hairline bg-[var(--cell)] text-[10px] font-bold">
              {numbers.has(key) && <span className="absolute left-[1px] top-0 text-[6px] leading-none muted">{numbers.get(key)}</span>}
              {letter}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BulkImport({ onClose, onImport }: { onClose: () => void; onImport: (w: MissionWord[], replace: boolean) => void }) {
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const parsed = text
    .split("\n")
    .map((l) => l.split("|").map((s) => s.trim()))
    .filter((p) => p[0] && p[1])
    .map(([answer, clue, note = "", example = ""]) => ({ answer: answer.toUpperCase().replace(/[^A-Z]/g, ""), clue, note, example }));
  return (
    <Modal title="Bulk import words" onClose={onClose}>
      <p className="mb-3 text-sm muted">
        One word per line: <code className="font-mono text-xs">ANSWER | clue | note | example</code>. Note and example are optional.
      </p>
      <textarea
        rows={8}
        className="input font-mono text-xs"
        placeholder={"PASSPORT | Document you show at border control | Proves your nationality | Have your passport ready."}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace existing words
      </label>
      <div className="mt-5 flex items-center justify-end gap-2">
        <span className="mr-auto text-xs muted">{parsed.length} words detected</span>
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" disabled={!parsed.length} onClick={() => onImport(parsed, replace)}>Import</button>
      </div>
    </Modal>
  );
}
