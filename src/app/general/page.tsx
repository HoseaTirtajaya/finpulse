import Link from "next/link";
import { AiBriefPanel } from "@/components/ai-brief-panel";
import { NewsCard } from "@/components/news-card";
import { getCachedNews } from "@/lib/cache";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ category?: string; q?: string }>;
};

export default async function GeneralPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = params.category || "all";
  const q = params.q?.trim() || undefined;
  const news = await getCachedNews({ scope: "general", category, q });

  return (
    <main className="relative flex-1">
      <section className="relative overflow-hidden border-b border-[var(--fp-line)]">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <p className="text-xs font-semibold tracking-[0.22em] text-[var(--fp-accent)] uppercase">
            General news
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fp-ink)] md:text-5xl">
            Beyond the tape
          </h1>
          <p className="mt-3 max-w-xl text-[var(--fp-muted)]">
            World, tech, politics, sports, and culture — live RSS only, no
            fabricated desk corpus.
          </p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_300px] md:px-6">
        <section id="feed" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <p className="text-sm text-[var(--fp-muted)]">
              {news.liveSources.length > 0
                ? `Live from ${news.liveSources.join(", ")}.`
                : "No live sources responded."}
              {news.failedSources.length > 0
                ? ` Failed: ${news.failedSources.join(", ")}.`
                : ""}
              {" · "}
              {news.items.length} stories
            </p>
            <Link
              href="/general"
              className="text-sm text-[var(--fp-accent)] hover:underline"
            >
              Reset filters
            </Link>
          </div>
          {news.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--fp-line)] bg-white/40 px-6 py-14 text-center text-sm text-[var(--fp-muted)]">
              No headlines matched. Try another category or clear search.
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--fp-line)] bg-white/45 px-4 md:px-6">
              {news.items.map((item, index) => (
                <NewsCard key={item.id} item={item} index={index} />
              ))}
            </div>
          )}
        </section>
        <aside className="space-y-6 md:sticky md:top-24 md:self-start">
          <section id="brief">
            <AiBriefPanel scope="general" />
          </section>
        </aside>
      </div>
    </main>
  );
}
