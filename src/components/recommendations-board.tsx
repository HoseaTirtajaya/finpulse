"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, RefreshCw, Sparkles } from "lucide-react";
import { AiBriefPanel } from "@/components/ai-brief-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/components/watchlist-provider";
import { formatChangePct, formatPrice, getInstrument } from "@/lib/instruments";
import type {
  RecAction,
  RecMarketSegment,
  Recommendation,
  RecommendationBundle,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ACTION_STYLE: Record<RecAction, string> = {
  lean_in: "bg-emerald-100 text-emerald-900",
  watch: "bg-slate-100 text-slate-800",
  lean_out: "bg-amber-100 text-amber-950",
  needs_data: "bg-sky-100 text-sky-950",
};

const ACTION_COPY: Record<RecAction, string> = {
  lean_in: "Lean in",
  watch: "Watch",
  lean_out: "Lean out",
  needs_data: "Needs data",
};

const SEGMENTS: { id: RecMarketSegment; label: string }[] = [
  { id: "all", label: "All" },
  { id: "US", label: "US" },
  { id: "EU", label: "EU" },
  { id: "Asia", label: "Asia" },
  { id: "ID", label: "Indonesia" },
  { id: "global", label: "Global" },
  { id: "crypto", label: "Crypto" },
];

function parseSegment(raw: string | null): RecMarketSegment {
  if (
    raw &&
    SEGMENTS.some((s) => s.id === raw)
  ) {
    return raw as RecMarketSegment;
  }
  return "all";
}

export function RecommendationsBoard() {
  const searchParams = useSearchParams();
  const { symbols, ready } = useWatchlist();
  const [scope, setScope] = useState<"watchlist" | "universe">("watchlist");
  const [market, setMarket] = useState<RecMarketSegment>(() =>
    parseSegment(searchParams.get("market")),
  );
  const [bundle, setBundle] = useState<RecommendationBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);

  useEffect(() => {
    setMarket(parseSegment(searchParams.get("market")));
  }, [searchParams]);

  const querySymbols = useMemo(
    () => (scope === "universe" ? "" : symbols.join(",")),
    [scope, symbols],
  );

  async function load(opts?: { silent?: boolean }) {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (scope === "watchlist" && symbols.length > 0) {
        // Only send symbols that belong in the active segment. If none match
        // (common for Crypto with an equity watchlist), omit symbols so the
        // API returns the full crypto universe instead of an empty board.
        let list = symbols;
        if (market === "crypto") {
          list = symbols.filter((s) => getInstrument(s)?.type === "crypto");
        } else if (market !== "all") {
          list = symbols.filter((s) => getInstrument(s)?.market === market);
        }
        if (list.length > 0) {
          params.set("symbols", list.join(","));
        }
      }
      if (market !== "all") params.set("market", market);
      const qs = params.toString();
      const res = await fetch(
        qs ? `/api/recommendations?${qs}` : "/api/recommendations",
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("failed");
      setBundle((await res.json()) as RecommendationBundle);
      setLastRefreshed(new Date().toISOString());
    } catch {
      if (!silent) setError("Could not build rankings. Try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, scope, querySymbols, market]);

  // Auto-refresh every 3 minutes so order tracks news/sentiment shifts.
  useEffect(() => {
    if (!ready || !autoRefresh) return;
    const id = window.setInterval(() => {
      void load({ silent: true });
    }, 3 * 60 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, autoRefresh, scope, querySymbols, market]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--fp-accent)] uppercase">
            Phase 2 · Idea ranking
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fp-ink)] md:text-5xl">
            Recommendations
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--fp-muted)]">
            Rankings shift with finance + general/trending sentiment, mention
            velocity, price/MAs, and regional macro calendar focus. AI briefs
            stay opt-in per symbol.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border border-[var(--fp-line)] bg-white/60 p-1">
            <button
              type="button"
              onClick={() => setScope("watchlist")}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm",
                scope === "watchlist"
                  ? "bg-[var(--fp-ink)] text-[var(--fp-paper)]"
                  : "text-[var(--fp-muted)]",
              )}
            >
              My watchlist
            </button>
            <button
              type="button"
              onClick={() => setScope("universe")}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm",
                scope === "universe"
                  ? "bg-[var(--fp-ink)] text-[var(--fp-paper)]"
                  : "text-[var(--fp-muted)]",
              )}
            >
              Full universe
            </button>
          </div>
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition",
              autoRefresh
                ? "border-[var(--fp-accent)] bg-[var(--fp-accent)]/10 text-[var(--fp-ink)]"
                : "border-[var(--fp-line)] bg-white/60 text-[var(--fp-muted)]",
            )}
            title="Re-rank every 3 minutes from latest news"
          >
            Auto {autoRefresh ? "on" : "off"}
          </button>
          <Button
            onClick={() => void load()}
            disabled={loading}
            className="bg-[var(--fp-ink)] text-[var(--fp-paper)] hover:bg-[var(--fp-accent)]"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setMarket(s.id);
              if (s.id === "crypto") {
                const hasCrypto = symbols.some(
                  (sym) => getInstrument(sym)?.type === "crypto",
                );
                if (!hasCrypto) setScope("universe");
              }
            }}
            className={cn(
              "rounded-sm px-2.5 py-1 text-xs transition",
              market === s.id
                ? "bg-[var(--fp-accent)] text-white"
                : "bg-white/50 text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {loading && !bundle && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-[var(--fp-chip)]"
            />
          ))}
        </div>
      )}

      {bundle && (
        <>
          <div className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
              Desk note
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--fp-ink)]/90">
              {bundle.marketNote}
            </p>
            <p className="mt-4 text-xs text-[var(--fp-muted)]">
              {bundle.disclaimer}
              {lastRefreshed
                ? ` · Updated ${new Date(lastRefreshed).toLocaleTimeString()}`
                : ""}
              {autoRefresh ? " · auto every 3m" : ""}
            </p>
          </div>

          {bundle.ideas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--fp-line)] bg-white/40 px-6 py-14 text-center text-sm text-[var(--fp-muted)]">
              No instruments in this segment
              {scope === "watchlist" ? " on your watchlist" : ""}. Try another
              market chip or switch to full universe.
            </div>
          ) : (
            <div className="space-y-4">
              {bundle.ideas.map((idea, index) => (
                <RecommendationRow
                  key={idea.symbol}
                  idea={idea}
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecommendationRow({
  idea,
  rank,
}: {
  idea: Recommendation;
  rank: number;
}) {
  const [showAi, setShowAi] = useState(false);
  const up = (idea.changePct ?? 0) >= 0;
  return (
    <article className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="font-mono text-sm text-[var(--fp-muted)]">
            #{rank}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/instrument/${encodeURIComponent(idea.symbol)}`}
                className="font-[family-name:var(--font-display)] text-2xl text-[var(--fp-ink)] hover:text-[var(--fp-accent)]"
              >
                {idea.symbol}
              </Link>
              <Badge className={cn("rounded-sm", ACTION_STYLE[idea.action])}>
                {ACTION_COPY[idea.action]}
              </Badge>
              <Badge variant="outline" className="rounded-sm font-mono">
                score {idea.score}
              </Badge>
              <Badge variant="outline" className="rounded-sm">
                {idea.market}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--fp-muted)]">
              {idea.name} · {idea.sector}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="font-mono text-xl text-[var(--fp-ink)]">
              {formatPrice(idea.lastPrice, idea.currency)}
            </p>
            <p
              className={cn(
                "inline-flex items-center gap-1 font-mono text-sm",
                idea.changePct == null
                  ? "text-[var(--fp-muted)]"
                  : up
                    ? "text-[var(--fp-up)]"
                    : "text-[var(--fp-down)]",
              )}
            >
              {idea.changePct != null &&
                (up ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                ))}
              {formatChangePct(idea.changePct)}
              {idea.quoteSource ? ` · ${idea.quoteSource}` : " · unavailable"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAi((v) => !v)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--fp-line)] bg-white/70 px-3 text-sm text-[var(--fp-ink)] transition hover:border-[var(--fp-accent)]"
          >
            <Sparkles className="size-3.5" />
            {showAi ? "Hide AI take" : "AI take"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <ScoreCell label="News tone" value={idea.breakdown.newsTone} />
        <ScoreCell label="Mentions" value={idea.breakdown.mentionMomentum} />
        <ScoreCell label="Price" value={idea.breakdown.priceAction} />
        <ScoreCell label="Coverage" value={idea.breakdown.coverage} />
        <ScoreCell label="MA trend" value={idea.breakdown.maTrend} />
        <ScoreCell label="Range" value={idea.breakdown.rangePosition} />
        <ScoreCell label="Macro" value={idea.breakdown.macroBoost} />
      </div>

      <ul className="mt-4 space-y-1.5 text-sm text-[var(--fp-ink)]/90">
        {idea.reasons.map((r) => (
          <li key={r}>· {r}</li>
        ))}
      </ul>

      {idea.topHeadlines.length > 0 && (
        <div className="mt-4 border-t border-[var(--fp-line)] pt-3">
          <p className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
            Headlines in score
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[var(--fp-muted)]">
            {idea.topHeadlines.map((h) => (
              <li key={h} className="truncate">
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAi && (
        <div className="mt-4 border-t border-[var(--fp-line)] pt-4">
          <AiBriefPanel symbol={idea.symbol} scope="finance" />
        </div>
      )}
    </article>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-[var(--fp-chip)]/70 px-3 py-2">
      <p className="text-[11px] tracking-wide text-[var(--fp-muted)] uppercase">
        {label}
      </p>
      <p className="font-mono text-sm text-[var(--fp-ink)]">
        {value > 0 ? "+" : ""}
        {value}
      </p>
    </div>
  );
}
