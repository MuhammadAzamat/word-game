"use client";
import { Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, formatDuration } from "@/lib/labels";
import type { Attempt } from "@/lib/types";
import { ConfirmButton } from "./Modal";
import { useMutation } from "./useMutation";

type Row = Attempt & { userName: string; missionTitle: string };

const STATUS: Record<Attempt["status"], string> = {
  completed: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  in_progress: "bg-sky-500/12 text-sky-600 dark:text-sky-300",
  abandoned: "bg-slate-500/12 muted",
};

export function AttemptTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Attempt["status"]>("all");
  const { run, error } = useMutation();

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!t || r.userName.toLowerCase().includes(t) || r.missionTitle.toLowerCase().includes(t)),
    );
  }, [rows, q, status]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input className="input sm:max-w-xs" placeholder="Filter by user or mission…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:w-44" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In progress</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <span className="self-center text-sm muted sm:ml-auto">{shown.length} attempts</span>
      </div>
      {error && <p className="mb-3 rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide muted">
              <th className="p-4 font-semibold">Player</th>
              <th className="p-4 font-semibold">Mission</th>
              <th className="p-4 font-semibold">Started</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Words</th>
              <th className="p-4 font-semibold">Hints</th>
              <th className="p-4 font-semibold">Time</th>
              <th className="p-4 font-semibold">Score</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 300).map((a) => (
              <tr key={a.id} className="border-t hairline">
                <td className="p-4 font-medium">{a.userName}</td>
                <td className="p-4">{a.missionTitle}</td>
                <td className="p-4 muted">{formatDate(a.startedAt)}</td>
                <td className="p-4">
                  <span className={`chip ${STATUS[a.status]}`}>{a.status.replace("_", " ")}</span>
                </td>
                <td className="p-4">{a.status === "completed" ? `${a.correctWords}/${a.totalWords}` : "—"}</td>
                <td className="p-4">{a.hintsUsed}</td>
                <td className="p-4 font-mono">{a.status === "completed" ? formatDuration(a.durationSec) : "—"}</td>
                <td className="p-4 font-bold">{a.status === "completed" ? a.score : "—"}</td>
                <td className="p-4 text-right">
                  <ConfirmButton
                    className="btn-ghost size-9 p-0 text-rose-500"
                    label="Delete attempt"
                    message="Delete this attempt?"
                    onConfirm={() => run(`/api/admin/attempts/${a.id}`, "DELETE")}
                  >
                    <Trash className="size-4" />
                  </ConfirmButton>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={9} className="p-10 text-center muted">No attempts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
