import Link from "next/link";
import { connection } from "next/server";
import { AiBriefPanel } from "@/components/ai-brief-panel";
import { CurrencyConverter } from "@/components/currency-converter";
import { MacroCalendarRail } from "@/components/macro-calendar-rail";
import { MarketHoursRail } from "@/components/market-hours-rail";
import { NewsCard } from "@/components/news-card";
import { TrendRail } from "@/components/trend-rail";
import { WatchlistBoard } from "@/components/watchlist-board";
import { getCachedMacroEvents, getCachedNews } from "@/lib/cache";
import { buildTrendSignals } from "@/lib/trends";
import type { MarketFilter } from "@/lib/types";

export const instant = false;

type HomeProps = {
  searchParams: Promise<{ category?: string; q?: string; market?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  await connection();
  const params = await searchParams;
  const category = params.category || "all";
  const q = params.q?.trim() || undefined;
  const market = (params.market as MarketFilter) || "all";

  const [news, macroEvents] = await Promise.all([
    getCachedNews({
      scope: "finance",
      category,
      q,
      market,
    }),
    getCachedMacroEvents(),
  ]);
  const trends = buildTrendSignals(news.items);

  return (
    <main className="relative flex-1">
      <section className="relative overflow-hidden border-b border-[var(--fp-line)]">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 md:px-6 md:py-20">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-[var(--fp-accent)] uppercase">
              <span className="hero-live-dot size-2 rounded-full bg-[var(--fp-accent)]" />
              Finance · US + IDX
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-[var(--fp-ink)] md:text-7xl">
              FinPulse
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--fp-muted)] md:text-xl">
              Real market headlines, a personal watchlist with live quotes, and
              transparent idea rankings — no invented news or demo prices.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#feed"
                className="rounded-md bg-[var(--fp-ink)] px-5 py-2.5 text-sm font-medium text-[var(--fp-paper)] transition hover:bg-[var(--fp-accent)]"
              >
                Open the feed
              </a>
              <Link
                href="/recommendations"
                className="rounded-md border border-[var(--fp-line)] bg-white/60 px-5 py-2.5 text-sm font-medium text-[var(--fp-ink)] transition hover:border-[var(--fp-accent)]"
              >
                Rank ideas
              </Link>
              <Link
                href="/general"
                className="rounded-md border border-[var(--fp-line)] bg-white/60 px-5 py-2.5 text-sm font-medium text-[var(--fp-ink)] transition hover:border-[var(--fp-accent)]"
              >
                General news
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_280px] md:px-6 lg:gap-14">
        <div className="min-w-0 space-y-10">
          <WatchlistBoard />

          <section id="brief">
            <AiBriefPanel scope="finance" />
          </section>

          <section id="feed">
            <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--fp-ink)]">
                  Headline feed
                </h2>
                <p className="mt-1 text-sm text-[var(--fp-muted)]">
                  {news.liveSources.length > 0
                    ? `Live from ${news.liveSources.join(", ")}.`
                    : "No live sources responded."}
                  {news.failedSources.length > 0
                    ? ` Failed: ${news.failedSources.join(", ")}.`
                    : ""}
                  {" · "}
                  {news.items.length} stories
                  {q ? ` matching “${q}”` : ""}
                </p>
              </div>
              <Link
                href="/"
                className="text-sm text-[var(--fp-accent)] hover:underline"
              >
                Reset filters
              </Link>
            </div>

            {news.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--fp-line)] bg-white/40 px-6 py-14 text-center">
                <p className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
                  {news.emptyStore
                    ? "Awaiting first ingest"
                    : "No headlines available"}
                </p>
                <p className="mt-2 text-sm text-[var(--fp-muted)]">
                  {news.emptyStore
                    ? "Database is connected but empty. Run npm run ingest (or wait for cron)."
                    : news.failedSources.length > 0
                      ? `Sources unreachable: ${news.failedSources.join(", ")}.`
                      : "Try another category or clear the search."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--fp-line)] bg-white/45 px-4 md:px-6">
                {news.items.map((item, index) => (
                  <NewsCard key={item.id} item={item} index={index} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 md:sticky md:top-24 md:self-start">
          <MarketHoursRail />
          <CurrencyConverter />
          <MacroCalendarRail events={macroEvents} />
          <div className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5 backdrop-blur-sm">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
              Theme pulse
            </h2>
            <p className="mt-1 mb-4 text-sm text-[var(--fp-muted)]">
              Headline tone by theme from the live finance feed.
            </p>
            <TrendRail trends={trends} />
          </div>
          <div className="rounded-xl border border-[var(--fp-line)] bg-[var(--fp-ink)] p-5 text-[var(--fp-paper)]">
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              Rank your watchlist
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Scores blend news tone, mention velocity, MA trend, and range
              position — then suggest lean in, watch, lean out, or needs data.
            </p>
            <Link
              href="/recommendations"
              className="mt-4 inline-flex rounded-md bg-[var(--fp-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
            >
              Open recommendations
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
