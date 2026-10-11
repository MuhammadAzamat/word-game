"use client";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { Logo } from "./Logo";
import { useSession } from "./session";

export function Header() {
  const { user, loading } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-[var(--bg)]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="mr-auto flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
          <Logo />
          <span>
            Word<span className="bg-gradient-to-r from-brand-500 to-fuchsia-500 bg-clip-text text-transparent">Quest</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          <Link href="/#missions" className="btn-ghost">Missions</Link>
          {user && <Link href="/profile" className="btn-ghost">Progress</Link>}
          {user?.role === "admin" && <Link href="/admin" className="btn-ghost">Admin</Link>}
        </nav>
        <ThemeToggle />
        {loading ? (
          <span className="size-10" />
        ) : user ? (
          <UserMenu user={user} />
        ) : (
          <div className="flex items-center gap-1">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/register" className="btn-primary hidden sm:inline-flex">Start free</Link>
          </div>
        )}
      </div>
    </header>
  );
}
