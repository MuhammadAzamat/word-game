"use client";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { PageSpinner, RequireAuth } from "@/components/session";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RequireAuth admin>
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 hidden px-2 text-xs font-bold uppercase tracking-wider muted lg:block">Admin panel</div>
            <AdminNav />
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      </RequireAuth>
    </Suspense>
  );
}
