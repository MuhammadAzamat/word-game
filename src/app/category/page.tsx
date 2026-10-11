"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MissionCard } from "@/components/MissionCard";
import { ErrorState, PageSpinner, useRpc, useSession } from "@/components/session";

export default function CategoryPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Category />
    </Suspense>
  );
}

function Category() {
  const slug = useSearchParams().get("slug") ?? "";
  const { user, loading: sessionLoading } = useSession();
  const { data, error, reload } = useRpc("catalog", { slug, user: user?.id ?? null }, !sessionLoading);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <PageSpinner />;
  const category = data.category!;
  const items = data.items;
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
