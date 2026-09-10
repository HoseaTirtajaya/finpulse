import Link from "next/link";
import { notFound } from "next/navigation";
import { AiBriefPanel } from "@/components/ai-brief-panel";
import { NewsCard } from "@/components/news-card";
import { WatchlistToggle } from "@/components/watchlist-toggle";
import { generateBrief } from "@/lib/ai/analyze";
import {
  formatChangePct,
  formatPrice,
  getInstrument,
  INSTRUMENTS,
} from "@/lib/instruments";
import { getCachedNews, getCachedQuotes } from "@/lib/cache";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ symbol: string }>;
};

export function generateStaticParams() {
  return INSTRUMENTS.map((i) => ({ symbol: i.symbol }));
}

export default async function InstrumentPage({ params }: PageProps) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw);
  const instrument = getInstrument(symbol);
  if (!instrument) notFound();

  const [news, quotes] = await Promise.all([
    getCachedNews({ scope: "finance", symbol: instrument.symbol }),
    getCachedQuotes(instrument.symbol),
  ]);
  const quote = quotes[0];
  const brief = await generateBrief(news.items, instrument.symbol, "finance");
  const changePct = quote?.changePct ?? null;
  const up = changePct != null ? changePct >= 0 : true;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-[var(--fp-accent)] hover:underline">
          ← Back to feed
        </Link>
        <div className="flex gap-2">
          <WatchlistToggle symbol={instrument.symbol} />
          <Link
            href="/recommendations"
            className="inline-flex h-8 items-center rounded-lg border border-[var(--fp-line)] bg-white/70 px-3 text-sm"
          >
            Rank ideas
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
        <AiBriefPanel
          symbol={instrument.symbol}
          scope="finance"
          initialBrief={brief}
        />

        <section>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--fp-ink)]">
            Related coverage
          </h2>
          <p className="mt-1 mb-4 text-sm text-[var(--fp-muted)]">
            Headlines mentioning {instrument.symbol} or its narrative keywords.
          </p>
          {news.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--fp-line)] bg-white/40 px-6 py-12 text-center text-sm text-[var(--fp-muted)]">
              No matching stories in the current feed. Browse the{" "}
              <Link href="/" className="text-[var(--fp-accent)] underline">
                headline feed
              </Link>
              .
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
    </main>
  );
}
