"use client";
import { FolderTree, LayoutDashboard, ListChecks, Puzzle, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/missions", label: "Missions", icon: Puzzle },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/attempts", label: "Attempts", icon: ListChecks },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="card flex gap-1 overflow-x-auto p-1.5 lg:flex-col">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`btn shrink-0 justify-start ${active ? "bg-brand-500/12 text-brand-600 dark:text-brand-300" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
          >
            <l.icon className="size-4" /> {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
