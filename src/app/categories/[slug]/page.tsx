import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MissionCard } from "@/components/MissionCard";
import { getCurrentUser } from "@/lib/auth";
import { missionSummaries } from "@/lib/catalog";
import { getCategoryBySlug } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getCategoryBySlug((await params).slug);
  return { title: c?.name ?? "Category" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const category = await getCategoryBySlug((await params).slug);
  if (!category) notFound();
  const user = await getCurrentUser();
  const { items } = await missionSummaries(user?.id ?? null, (m) => m.categoryId === category.id);
  const done = items.filter((i) => i.best !== null).length;

  return (
    <div className="space-y-8">
      <Link href="/" className="btn-ghost -ml-3">
        <ArrowLeft className="size-4" /> All categories
      </Link>
      <section className="card relative overflow-hidden p-8 sm:p-10 animate-rise">
        <div
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at 85% 20%, ${category.color}, transparent 60%)` }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div
            className="flex size-20 items-center justify-center rounded-3xl text-5xl shadow-lg"
            style={{ background: `${category.color}26` }}
          >
            {category.icon}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{category.name}</h1>
            <p className="mt-2 max-w-2xl muted">{category.description}</p>
          </div>
          {user && items.length > 0 && (
            <div className="text-right">
              <div className="font-display text-3xl font-bold">
                {done}/{items.length}
              </div>
              <div className="text-xs muted">missions completed</div>
            </div>
          )}
        </div>
      </section>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <MissionCard key={it.mission.id} {...it} index={i} />
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center muted">No missions here yet — check back soon.</div>
      )}
    </div>
  );
}
