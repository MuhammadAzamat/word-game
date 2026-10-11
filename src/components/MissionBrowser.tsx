"use client";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { FOCUS } from "@/lib/labels";
import type { Focus } from "@/lib/types";
import { MissionCard, type MissionSummary } from "./MissionCard";

const FILTERS: (Focus | "all")[] = ["all", "grammar", "vocabulary", "speaking", "knowledge"];

export function MissionBrowser({ items }: { items: MissionSummary[] }) {
  const [focus, setFocus] = useState<Focus | "all">("all");
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter(
      (it) =>
        (focus === "all" || it.mission.focus === focus) &&
        (!term ||
          it.mission.title.toLowerCase().includes(term) ||
          it.mission.description.toLowerCase().includes(term) ||
          it.category.name.toLowerCase().includes(term)),
    );
  }, [items, focus, q]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={focus === f}
              onClick={() => setFocus(f)}
              className={`btn shrink-0 rounded-full px-3.5 py-1.5 ${
                focus === f ? "bg-[var(--text)] text-[var(--bg)]" : "glass hover:brightness-95"
              }`}
            >
              {f === "all" ? "All" : `${FOCUS[f].emoji} ${FOCUS[f].label}`}
            </button>
          ))}
        </div>
        <label className="relative sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 muted" />
          <input
            className="input pl-10"
            placeholder="Search missions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search missions"
          />
        </label>
      </div>
      {shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((it, i) => (
            <MissionCard key={it.mission.id} {...it} index={i} />
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center muted">No missions match your filters.</div>
      )}
    </div>
  );
}
