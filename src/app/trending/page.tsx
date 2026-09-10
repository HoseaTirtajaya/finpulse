import { AiBriefPanel } from "@/components/ai-brief-panel";
import { TrendingClusters } from "@/components/trending-clusters";
import { getCachedNews } from "@/lib/cache";
import { buildTrendClusters } from "@/lib/news/trending";
import { generateBrief } from "@/lib/ai/analyze";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const news = await getCachedNews({ scope: "trending" });
  const clusters = buildTrendClusters(news.items);
  const topHeadlines = clusters.flatMap((c) =>
    c.headlines.map((h) => ({
      id: h.url,
      title: h.title,
      summary: "",
      url: h.url,
      source: h.source,
      publishedAt: h.publishedAt,
      category: "world",
      tickers: [] as string[],
      scope: "general" as const,
    })),
  );
  const brief = await generateBrief(
    topHeadlines.slice(0, 10),
    undefined,
    "trending",
  );

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
            Stories clustered by title similarity and ranked by unique-source
            count × recency — a velocity proxy, not a buy signal.
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
        <TrendingClusters clusters={clusters} />
        <aside className="md:sticky md:top-24 md:self-start" id="brief">
          <AiBriefPanel scope="trending" initialBrief={brief} />
        </aside>
      </div>
    </main>
  );
}
