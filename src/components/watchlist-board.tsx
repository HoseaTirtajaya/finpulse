"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { InstrumentChip } from "@/components/instrument-chip";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/components/watchlist-provider";
import { INSTRUMENTS } from "@/lib/instruments";
import type { Quote } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WatchlistBoard() {
  const { symbols, ready, toggle, reset, isWatched } = useWatchlist();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const watched = useMemo(
    () =>
      symbols
        .map((s) => INSTRUMENTS.find((i) => i.symbol === s))
        .filter((i): i is NonNullable<typeof i> => Boolean(i)),
    [symbols],
  );

  const quoteMap = useMemo(() => {
    const map = new Map<string, Quote>();
    for (const q of quotes) map.set(q.symbol.toUpperCase(), q);
    return map;
  }, [quotes]);

  useEffect(() => {
    if (!ready || symbols.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const qs = encodeURIComponent(symbols.join(","));
    fetch(`/api/quotes?symbols=${qs}`)
      .then((r) => r.json())
      .then((data: { quotes: Quote[]; liveCount: number }) => {
        if (cancelled) return;
        setQuotes(data.quotes ?? []);
        setLiveCount(data.liveCount ?? 0);
      })
      .catch(() => {
        if (!cancelled) setQuotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, symbols]);

  return (
    <section id="watchlist">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--fp-ink)]">
            Your watchlist
          </h2>
          <p className="mt-1 text-sm text-[var(--fp-muted)]">
            Saved in this browser.{" "}
            {loading
              ? "Refreshing quotes…"
              : liveCount > 0
                ? `${liveCount} live quote${liveCount === 1 ? "" : "s"} · rest demo fallback.`
                : "Showing demo quotes (live feed unavailable)."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="border border-[var(--fp-line)] bg-white/70"
            onClick={reset}
          >
            Reset defaults
          </Button>
          <Link
            href="/recommendations"
            className="inline-flex h-8 items-center rounded-lg bg-[var(--fp-ink)] px-3 text-sm font-medium text-[var(--fp-paper)] transition hover:bg-[var(--fp-accent)]"
          >
            Rank ideas
          </Link>
        </div>
      </div>

      {watched.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--fp-line)] bg-white/40 px-5 py-10 text-center text-sm text-[var(--fp-muted)]">
          Watchlist empty — star any name in the universe below.
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {watched.map((instrument, i) => {
            const q = quoteMap.get(instrument.symbol.toUpperCase());
            const enriched = q
              ? {
                  ...instrument,
                  lastPrice: q.price,
                  changePct: q.changePct,
                }
              : instrument;
            return (
              <div
                key={instrument.symbol}
                className="relative"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <InstrumentChip instrument={enriched} active />
                <button
                  type="button"
                  aria-label={`Remove ${instrument.symbol}`}
                  onClick={() => toggle(instrument.symbol)}
                  className="absolute -top-1.5 -right-1.5 rounded-full border border-[var(--fp-line)] bg-white p-1 text-[var(--fp-accent)] shadow-sm"
                >
                  <Star className="size-3 fill-current" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-xs font-semibold tracking-[0.18em] text-[var(--fp-muted)] uppercase">
          Universe — add to watchlist
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {INSTRUMENTS.map((inst) => {
            const watchedNow = isWatched(inst.symbol);
            return (
              <button
                key={inst.symbol}
                type="button"
                onClick={() => toggle(inst.symbol)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-xs transition",
                  watchedNow
                    ? "border-[var(--fp-accent)] bg-[var(--fp-accent-soft)] text-[var(--fp-ink)]"
                    : "border-[var(--fp-line)] bg-white/50 text-[var(--fp-muted)] hover:border-[var(--fp-accent)]/50",
                )}
              >
                <Star
                  className={cn(
                    "size-3",
                    watchedNow && "fill-current text-[var(--fp-accent)]",
                  )}
                />
                {inst.symbol}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
