"use client";
import { LogOut, Shield, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { rpc } from "@/lib/client";
import type { PublicUser } from "@/lib/types";
import { useSession } from "./session";

export function UserMenu({ user }: { user: PublicUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { refresh } = useSession();

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function logout() {
    await rpc("logout");
    await refresh();
    router.push("/");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-sm font-bold text-white shadow-md"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {user.name.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div className="card absolute right-0 top-12 z-50 w-56 overflow-hidden p-1.5 animate-rise">
          <div className="px-3 py-2">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="truncate text-xs muted">{user.email}</div>
          </div>
          <Link href="/profile" onClick={() => setOpen(false)} className="btn-ghost w-full justify-start">
            <UserIcon className="size-4" /> My progress
          </Link>
          {user.role === "admin" && (
            <Link href="/admin" onClick={() => setOpen(false)} className="btn-ghost w-full justify-start">
              <Shield className="size-4" /> Admin panel
            </Link>
          )}
          <button type="button" onClick={logout} className="btn-ghost w-full justify-start text-rose-500">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
