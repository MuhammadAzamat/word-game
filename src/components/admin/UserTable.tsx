"use client";
import { Trash } from "lucide-react";
import { formatDate } from "@/lib/labels";
import type { PublicUser } from "@/lib/types";
import { ConfirmButton } from "./Modal";
import { useMutation } from "./useMutation";

type Row = PublicUser & { attempts: number };

export function UserTable({ rows, meId, onChanged }: { rows: Row[]; meId: string; onChanged: () => void }) {
  const { run, busy, error } = useMutation(onChanged);
  return (
    <div className="card overflow-x-auto">
      {error && <p className="m-4 rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">{error}</p>}
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide muted">
            <th className="p-4 font-semibold">User</th>
            <th className="p-4 font-semibold">Joined</th>
            <th className="p-4 font-semibold">Attempts</th>
            <th className="p-4 font-semibold">Role</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t hairline">
              <td className="p-4">
                <div className="font-medium">{u.name}</div>
                <div className="text-xs muted">{u.email}</div>
              </td>
              <td className="p-4 muted">{formatDate(u.createdAt)}</td>
              <td className="p-4">{u.attempts}</td>
              <td className="p-4">
                <select
                  className="input w-28 py-1.5"
                  value={u.role}
                  disabled={busy || u.id === meId}
                  onChange={(e) => run("admin.user.role", { id: u.id, role: e.target.value })}
                  aria-label={`Role of ${u.name}`}
                >
                  <option value="user">Learner</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="p-4 text-right">
                {u.id !== meId && (
                  <ConfirmButton
                    className="btn-ghost size-9 p-0 text-rose-500"
                    label="Delete user"
                    message={`Delete ${u.name} and all their attempts?`}
                    onConfirm={() => run("admin.user.delete", { id: u.id })}
                  >
                    <Trash className="size-4" />
                  </ConfirmButton>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
