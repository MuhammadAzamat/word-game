import { ArrowRight, BookOpen, Globe, Mic, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { MissionBrowser } from "@/components/MissionBrowser";
import { getCurrentUser } from "@/lib/auth";
import { missionSummaries } from "@/lib/catalog";
import { starsFor } from "@/lib/crossword";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  const { categories, items, best } = await missionSummaries(user?.id ?? null);
  const stars = [...best.values()].reduce((s, v) => s + starsFor(v), 0);
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it.category.slug, (counts.get(it.category.slug) ?? 0) + 1);

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="animate-rise">
          <span className="chip glass mb-4">
            <Sparkles className="size-3.5 text-fuchsia-500" /> {items.length} missions · {categories.length} categories
          </span>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            {user ? (
              <>
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-brand-500 via-fuchsia-500 to-amber-400 bg-clip-text text-transparent">
                  {user.name.split(" ")[0]}
                </span>
              </>
            ) : (
              <>
                Learn English,{" "}
                <span className="bg-gradient-to-r from-brand-500 via-fuchsia-500 to-amber-400 bg-clip-text text-transparent">
                  one crossword
                </span>{" "}
                at a time.
              </>
            )}
          </h1>
          <p className="mt-4 max-w-xl text-lg muted">
            Solve missions about tourism, history, inventions and technology. Practise grammar, hear every answer
            pronounced, then say it out loud.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#missions" className="btn-primary px-6 py-3 text-base">
              Choose a mission <ArrowRight className="size-4" />
            </Link>
            {!user && (
              <Link href="/register" className="btn-outline px-6 py-3 text-base">
                Create account
              </Link>
            )}
          </div>
        </div>

        {user ? (
          <div className="card grid grid-cols-3 gap-2 p-5 animate-rise" style={{ animationDelay: "120ms" }}>
            {[
              { label: "Completed", value: `${best.size}/${items.length}` },
              { label: "Stars", value: `${stars}/${items.length * 3}` },
              { label: "Best total", value: [...best.values()].reduce((s, v) => s + v, 0).toLocaleString() },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-3 text-center">
                <div className="font-display text-2xl font-bold sm:text-3xl">{s.value}</div>
                <div className="text-xs muted">{s.label}</div>
              </div>
            ))}
            <div className="col-span-3 mt-1 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500"
                style={{ width: `${items.length ? (best.size / items.length) * 100 : 0}%` }}
              />
            </div>
            <Link href="/profile" className="btn-ghost col-span-3 mt-1">
              <Trophy className="size-4" /> View my progress
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 animate-rise" style={{ animationDelay: "120ms" }}>
            {[
              { icon: BookOpen, title: "Grammar in context", text: "Past simple, passives, plurals and phrasal verbs inside real clues." },
              { icon: Mic, title: "Listen & speak", text: "Hear every answer and practise pronunciation with your microphone." },
              { icon: Globe, title: "World knowledge", text: "Landmarks, inventors and historic moments — learn facts as you play." },
            ].map((f) => (
              <div key={f.title} className="card flex gap-4 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-fuchsia-500/15 text-brand-500">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <div className="font-semibold">{f.title}</div>
                  <div className="text-sm muted">{f.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold">Categories</h2>
        </div>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className="card group relative w-56 shrink-0 snap-start overflow-hidden p-5 transition hover:-translate-y-1 sm:w-auto animate-rise"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className="absolute inset-0 opacity-[.13] transition group-hover:opacity-25"
                style={{ background: `linear-gradient(135deg, ${c.color}, transparent 70%)` }}
              />
              <div className="relative">
                <div className="text-3xl transition group-hover:scale-110 group-hover:-rotate-6">{c.icon}</div>
                <div className="mt-3 font-display font-bold">{c.name}</div>
                <div className="mt-0.5 text-xs muted">{counts.get(c.slug) ?? 0} missions</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="missions" className="scroll-mt-24">
        <h2 className="mb-5 font-display text-2xl font-bold">All missions</h2>
        <MissionBrowser items={items} />
      </section>
    </div>
  );
}
