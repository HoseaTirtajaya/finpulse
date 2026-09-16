import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { AiBriefPanel } from "@/components/ai-brief-panel";
import { InstrumentPriceChart } from "@/components/instrument-price-chart";
import { InstrumentReviewPanel } from "@/components/instrument-review-panel";
import { NewsCard } from "@/components/news-card";
import { WatchlistToggle } from "@/components/watchlist-toggle";
import {
  formatChangePct,
  formatCompactUsd,
  formatPrice,
  getInstrument,
  INSTRUMENTS,
} from "@/lib/instruments";
import { getCachedNews, getCachedQuotes } from "@/lib/cache";
import { loadCandlesForSymbol } from "@/lib/market/load-candles";
import { getUpcomingEventsForInstrument } from "@/lib/macro/events-for-instrument";
import { matchesInstrument } from "@/lib/news/match-instrument";
import { toneScoreFromItems } from "@/lib/sentiment";
import { cn } from "@/lib/utils";

export const instant = false;

type PageProps = {
  params: Promise<{ symbol: string }>;
};

export function generateStaticParams() {
  return INSTRUMENTS.map((i) => ({ symbol: i.symbol }));
}

function stanceFromScore(score: number): {
  label: string;
  className: string;
} {
  if (score >= 12)
    return { label: "constructive", className: "bg-emerald-100 text-emerald-900" };
  if (score <= -12)
    return { label: "cautious", className: "bg-amber-100 text-amber-950" };
  if (score > 3 || score < -3)
    return { label: "mixed", className: "bg-sky-100 text-sky-950" };
  return { label: "neutral", className: "bg-slate-100 text-slate-800" };
}

export default async function InstrumentPage({ params }: PageProps) {
  await connection();
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw);
  const instrument = getInstrument(symbol);
  if (!instrument) notFound();

  const [financeNews, trendingNews, quotes, upcomingEvents, candleBundle] =
    await Promise.all([
      getCachedNews({ scope: "finance", category: "all" }),
      getCachedNews({ scope: "trending" }),
      getCachedQuotes(instrument.symbol),
      getUpcomingEventsForInstrument(instrument, { days: 7 }),
      loadCandlesForSymbol(instrument.symbol, "1y"),
    ]);

  const seen = new Set<string>();
  const related = [...financeNews.items, ...trendingNews.items].filter(
    (item) => {
      if (seen.has(item.id)) return false;
      const ok = matchesInstrument(
        item,
        instrument.symbol,
        instrument.name,
        instrument.aliases,
      );
      if (ok) seen.add(item.id);
      return ok;
    },
  );

  const quote = quotes[0];
  const changePct = quote?.changePct ?? null;
  const up = changePct != null ? changePct >= 0 : true;
  const isCrypto = instrument.type === "crypto";
  const toneScore = toneScoreFromItems(related);
  const stance = stanceFromScore(toneScore);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isCrypto ? "/crypto" : "/recommendations"}
          className="text-sm text-[var(--fp-accent)] hover:underline"
        >
          ← Back to {isCrypto ? "crypto markets" : "recommendations"}
        </Link>
        <div className="flex gap-2">
          <WatchlistToggle symbol={instrument.symbol} />
          <Link
            href={isCrypto ? "/?category=crypto" : "/"}
            className="inline-flex h-8 items-center rounded-lg border border-[var(--fp-line)] bg-white/70 px-3 text-sm"
          >
            Headline feed
          </Link>
        </div>
      </div>

      <section className="relative mt-6 overflow-hidden rounded-2xl border border-[var(--fp-line)] bg-white/50">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative px-5 py-8 md:px-8 md:py-10">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--fp-accent)] uppercase">
            {instrument.market} · {instrument.type} · {instrument.sector}
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--fp-ink)] md:text-5xl">
                {instrument.symbol}
              </h1>
              <p className="mt-1 text-lg text-[var(--fp-muted)]">
                {instrument.name}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl text-[var(--fp-ink)]">
                {formatPrice(quote?.price, instrument.currency, instrument.type)}
              </p>
              <p
                className={cn(
                  "font-mono text-sm",
                  changePct == null
                    ? "text-[var(--fp-muted)]"
                    : up
                      ? "text-[var(--fp-up)]"
                      : "text-[var(--fp-down)]",
                )}
              >
                {formatChangePct(changePct)}
                {quote ? " · live quote" : " · quote unavailable"}
              </p>
            </div>
          </div>

          {isCrypto && quote && (
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--fp-line)] bg-white/60 px-4 py-3">
                <dt className="text-xs tracking-wider text-[var(--fp-muted)] uppercase">
                  Rank
                </dt>
                <dd className="mt-1 font-mono text-lg text-[var(--fp-ink)]">
                  {quote.rank != null ? `#${quote.rank}` : "—"}
                </dd>
              </div>
              <div className="rounded-lg border border-[var(--fp-line)] bg-white/60 px-4 py-3">
                <dt className="text-xs tracking-wider text-[var(--fp-muted)] uppercase">
                  Market cap
                </dt>
                <dd className="mt-1 font-mono text-lg text-[var(--fp-ink)]">
                  {formatCompactUsd(quote.marketCap)}
                </dd>
              </div>
              <div className="rounded-lg border border-[var(--fp-line)] bg-white/60 px-4 py-3">
                <dt className="text-xs tracking-wider text-[var(--fp-muted)] uppercase">
                  Volume 24h
                </dt>
                <dd className="mt-1 font-mono text-lg text-[var(--fp-ink)]">
                  {formatCompactUsd(quote.volume24h)}
                </dd>
              </div>
            </dl>
          )}

          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--fp-muted)]">
            {instrument.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {instrument.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-[var(--fp-chip)] px-2 py-0.5 text-xs text-[var(--fp-ink)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-8 space-y-8">
        <InstrumentPriceChart
          symbol={instrument.symbol}
          currency={instrument.currency}
          instrumentType={instrument.type}
          initialCandles={candleBundle.candles}
          initialRange={candleBundle.range}
          initialHasOhlc={candleBundle.hasOhlc}
        />

        {(isCrypto || related.length > 0) && (
          <section className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
                  News sentiment
                </h2>
                <p className="mt-1 text-sm text-[var(--fp-muted)]">
                  Lexicon tone across {related.length} matched headline
                  {related.length === 1 ? "" : "s"} (−40 to +40).
                </p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "inline-flex rounded-sm px-2 py-0.5 text-xs font-medium capitalize",
                    stance.className,
                  )}
                >
                  {stance.label}
                </span>
                <p
                  className={cn(
                    "mt-1 font-mono text-2xl",
                    toneScore > 0
                      ? "text-[var(--fp-up)]"
                      : toneScore < 0
                        ? "text-[var(--fp-down)]"
                        : "text-[var(--fp-muted)]",
                  )}
                >
                  {toneScore > 0 ? "+" : ""}
                  {toneScore}
                </p>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--fp-ink)]">
            Related news
          </h2>
          <p className="mt-1 mb-4 text-sm text-[var(--fp-muted)]">
            Headlines matching {instrument.symbol}
            {instrument.aliases?.length
              ? ` / ${instrument.aliases.slice(0, 3).join(", ")}`
              : ""}{" "}
            from the finance + trending ingest pool ({related.length} matched).
          </p>
          {related.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--fp-line)] bg-white/40 px-6 py-12 text-center text-sm text-[var(--fp-muted)]">
              No matching stories in the current store. Run ingest or check the{" "}
              <Link href="/" className="text-[var(--fp-accent)] underline">
                headline feed
              </Link>
              .
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--fp-line)] bg-white/45 px-4 md:px-6">
              {related.map((item, index) => (
                <NewsCard key={item.id} item={item} index={index} />
              ))}
            </div>
          )}
        </section>

        <InstrumentReviewPanel
          symbol={instrument.symbol}
          upcomingEvents={upcomingEvents}
        />
        <AiBriefPanel symbol={instrument.symbol} scope="finance" />
      </div>
    </main>
  );
}
