import { connection } from "next/server";
import { AiBriefPanel } from "@/components/ai-brief-panel";
import { TrendingClusters } from "@/components/trending-clusters";
import { getCachedNews } from "@/lib/cache";
import { buildTrendClusters } from "@/lib/news/trending";

export const instant = false;

export default async function TrendingPage() {
  await connection();
  const news = await getCachedNews({ scope: "trending" });
  const lanes = buildTrendClusters(news.items, Date.now());

  return (
    <main className="relative flex-1">
      <section className="relative overflow-hidden border-b border-[var(--fp-line)]">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <p className="text-xs font-semibold tracking-[0.22em] text-[var(--fp-accent)] uppercase">
            Trending
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fp-ink)] md:text-5xl">
            Rising across outlets
          </h1>
          <p className="mt-3 max-w-xl text-[var(--fp-muted)]">
            World and Indonesia ranked separately by unique-source count ×
            recency. A story needs two or more outlets in its region — a
            velocity proxy, not a buy signal.
          </p>
          <p className="mt-2 text-sm text-[var(--fp-muted)]">
            {news.liveSources.length > 0
              ? `Feeds: ${news.liveSources.join(", ")}.`
              : "No live feeds responded."}
            {news.failedSources.length > 0
              ? ` Failed: ${news.failedSources.join(", ")}.`
              : ""}
          </p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_320px] md:px-6">
        <TrendingClusters lanes={lanes} />
        <aside className="md:sticky md:top-24 md:self-start" id="brief">
          <AiBriefPanel scope="trending" />
        </aside>
      </div>
    </main>
  );
}
