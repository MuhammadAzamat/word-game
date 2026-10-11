import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s · Admin · WordQuest" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="mb-3 hidden px-2 text-xs font-bold uppercase tracking-wider muted lg:block">Admin panel</div>
        <AdminNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
