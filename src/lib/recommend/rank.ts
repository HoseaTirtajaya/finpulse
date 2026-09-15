import { getInstrument, INSTRUMENTS } from "@/lib/instruments";
import { getCachedCandles } from "@/lib/cache";
import {
  loadDailyBarsForSymbols,
  loadLinkedNewsBySymbol,
} from "@/lib/db/market-data";
import { hasDatabase } from "@/lib/db";
import { toneScoreFromItems } from "@/lib/sentiment";
import { matchesInstrument } from "@/lib/news/match-instrument";
import type { MacroEvent } from "@/lib/news/query-news";
import type {
  Candle,
  NewsItem,
  Quote,
  RecAction,
  Recommendation,
  RecommendationBundle,
  RecMarketSegment,
  ScoreBreakdown,
} from "@/lib/types";

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function maTrendScore(candles: Candle[]): number {
  const closes = candles.map((c) => c.close);
  if (closes.length < 20) return 0;
  const last = closes[closes.length - 1];
  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, Math.min(50, closes.length));
  if (ma20 == null) return 0;
  let score = 0;
  if (last > ma20) score += 8;
  else score -= 8;
  if (ma50 != null) {
    if (ma20 > ma50) score += 7;
    else score -= 7;
  }
  return Math.max(-20, Math.min(20, score));
}

function rangePositionScore(candles: Candle[]): number {
  if (candles.length < 20) return 0;
  const year = candles.slice(-252);
  const highs = year.map((c) => c.high);
  const lows = year.map((c) => c.low);
  const hi = Math.max(...highs);
  const lo = Math.min(...lows);
  if (hi === lo) return 0;
  const last = year[year.length - 1].close;
  const pos = (last - lo) / (hi - lo);
  return Math.round((pos - 0.5) * 20);
}

function priceScore(changePct: number | null): number {
  if (changePct == null) return 0;
  return Math.max(-15, Math.min(15, Math.round(changePct * 3)));
}

function mentionScore(count: number, maxCount: number): number {
  if (maxCount <= 0) return 0;
  return Math.round((count / maxCount) * 20);
}

function coverageScore(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 5;
  if (count === 2) return 8;
  return 12;
}

function mentionVelocity(
  related: NewsItem[],
): { recent: number; prior: number; bonus: number } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let recent = 0;
  let prior = 0;
  for (const n of related) {
    const age = now - new Date(n.publishedAt).getTime();
    if (age <= day) recent += 1;
    else if (age <= 7 * day) prior += 1;
  }
  const baseline = prior / 6;
  const bonus =
    baseline === 0
      ? recent > 0
        ? 8
        : 0
      : Math.max(
          -10,
          Math.min(
            10,
            Math.round(((recent - baseline) / Math.max(baseline, 0.5)) * 5),
          ),
        );
  return { recent, prior, bonus };
}

/** Map calendar country/currency codes to recommendation segments. */
function macroRegionsForCountry(country: string): Set<RecMarketSegment> {
  const c = country.trim().toUpperCase();
  const regions = new Set<RecMarketSegment>();
  if (["USD", "US", "USA"].includes(c)) {
    regions.add("US");
    regions.add("global");
  } else if (
    ["EUR", "EMU", "EU", "GBP", "UK", "GB", "CHF", "DE", "FR"].includes(c)
  ) {
    regions.add("EU");
    regions.add("global");
  } else if (
    ["JPY", "JP", "CNY", "CN", "HKD", "HK", "KRW", "KR", "TWD", "TW"].includes(
      c,
    )
  ) {
    regions.add("Asia");
    regions.add("global");
  } else if (["IDR", "ID"].includes(c)) {
    regions.add("ID");
  } else if (["AUD", "NZD", "CAD"].includes(c)) {
    regions.add("global");
  }
  return regions;
}

/**
 * Light regional attention boost from upcoming high/medium macro events.
 * High = +6, medium = +3 (capped). Not a directional bet — calendar focus only.
 */
export function macroBoostForMarket(
  instrumentMarket: Recommendation["market"],
  events: MacroEvent[],
): { boost: number; labels: string[] } {
  let boost = 0;
  const labels: string[] = [];
  for (const ev of events) {
    const regions = macroRegionsForCountry(ev.country);
    const hits =
      regions.has(instrumentMarket as RecMarketSegment) ||
      (instrumentMarket === "global" && regions.has("global"));
    if (!hits) continue;
    if (ev.impact === "high") {
      boost += 6;
      labels.push(`${ev.country} ${ev.title} (high)`);
    } else if (ev.impact === "medium") {
      boost += 3;
      labels.push(`${ev.country} ${ev.title} (med)`);
    }
  }
  return { boost: Math.min(12, boost), labels: labels.slice(0, 2) };
}

function pickAction(score: number, mentionCount: number): RecAction {
  if (mentionCount === 0 && score < 20) return "needs_data";
  if (score >= 35) return "lean_in";
  if (score <= -20) return "lean_out";
  return "watch";
}

function actionLabel(action: RecAction): string {
  switch (action) {
    case "lean_in":
      return "Lean in (research further)";
    case "lean_out":
      return "Lean out / reduce attention";
    case "needs_data":
      return "Needs more data";
    default:
      return "Watch";
  }
}

/** Dedupe headlines across finance / general / trending pools. */
export function mergeNewsPools(pools: NewsItem[][]): NewsItem[] {
  const map = new Map<string, NewsItem>();
  for (const pool of pools) {
    for (const item of pool) {
      const key = item.id || item.url || item.title.toLowerCase().slice(0, 80);
      if (!map.has(key)) map.set(key, item);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

async function persistRankingSnapshots(
  ideas: Recommendation[],
  market: RecMarketSegment,
): Promise<void> {
  if (!hasDatabase() || ideas.length === 0) return;
  try {
    const { getDb } = await import("@/lib/db");
    const { rankingSnapshots } = await import("@/lib/db/schema");
    const db = getDb();
    const scoredAt = new Date();
    const rows = ideas.map((idea) => ({
      id: `${idea.symbol}-${scoredAt.getTime()}`,
      symbol: idea.symbol,
      scoredAt,
      score: idea.score,
      action: idea.action,
      breakdown: idea.breakdown as unknown as Record<string, number>,
      market,
    }));
    const CHUNK = 40;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await db.insert(rankingSnapshots).values(rows.slice(i, i + CHUNK));
    }
  } catch (err) {
    console.error("persistRankingSnapshots failed", err);
  }
}

export async function rankRecommendations(input: {
  symbols: string[];
  news: NewsItem[];
  quotes: Quote[];
  scope: "watchlist" | "universe";
  market?: RecMarketSegment;
  macroEvents?: MacroEvent[];
}): Promise<RecommendationBundle> {
  const quoteMap = new Map(
    input.quotes.map((q) => [q.symbol.toUpperCase(), q]),
  );
  const market = input.market ?? "all";
  const macroEvents = input.macroEvents ?? [];

  let universe =
    input.symbols.length > 0
      ? input.symbols
          .map((s) => getInstrument(s))
          .filter((i): i is NonNullable<typeof i> => Boolean(i))
      : [...INSTRUMENTS];

  if (market === "crypto") {
    universe = universe.filter((i) => i.type === "crypto");
    if (universe.length === 0) {
      universe = INSTRUMENTS.filter((i) => i.type === "crypto");
    }
  } else if (market !== "all") {
    universe = universe.filter((i) => i.market === market);
  }

  const universeSymbols = universe.map((u) => u.symbol);

  // Prefer precomputed article_instruments; fall back to in-memory matching.
  const linkedMap = await loadLinkedNewsBySymbol(universeSymbols);
  const usedLinks = Array.from(linkedMap.values()).some((v) => v.length > 0);

  const relatedLists = universe.map((inst) => {
    if (usedLinks) {
      return linkedMap.get(inst.symbol) ?? [];
    }
    return input.news.filter((n) =>
      matchesInstrument(n, inst.symbol, inst.name, inst.aliases),
    );
  });
  const maxMentions = Math.max(0, ...relatedLists.map((r) => r.length));

  // Prefer daily_bars table; fall back to live candle fetches per symbol.
  const barMap = await loadDailyBarsForSymbols(universeSymbols);
  const missingBars = universeSymbols.filter(
    (s) => (barMap.get(s)?.length ?? 0) < 20,
  );
  if (missingBars.length > 0) {
    const live = await Promise.all(
      missingBars.map(async (symbol) => {
        try {
          const candles = await getCachedCandles(symbol, "1y");
          return [symbol, candles] as const;
        } catch {
          return [symbol, [] as Candle[]] as const;
        }
      }),
    );
    for (const [symbol, candles] of live) {
      if (candles.length) barMap.set(symbol, candles);
    }
  }

  const ideas: Recommendation[] = universe.map((inst, idx) => {
    const related = relatedLists[idx];
    const quote = quoteMap.get(inst.symbol.toUpperCase());
    const changePct = quote?.changePct ?? null;
    const lastPrice = quote?.price ?? null;
    const candles = barMap.get(inst.symbol) ?? [];
    const velocity = mentionVelocity(related);
    const macro = macroBoostForMarket(inst.market, macroEvents);

    const breakdown: ScoreBreakdown = {
      newsTone: toneScoreFromItems(related),
      mentionMomentum:
        mentionScore(related.length, maxMentions) + velocity.bonus,
      priceAction: priceScore(changePct),
      coverage: coverageScore(related.length),
      maTrend: maTrendScore(candles),
      rangePosition: rangePositionScore(candles),
      macroBoost: macro.boost,
    };

    const score =
      breakdown.newsTone +
      breakdown.mentionMomentum +
      breakdown.priceAction +
      breakdown.coverage +
      breakdown.maTrend +
      breakdown.rangePosition +
      breakdown.macroBoost;

    const action = pickAction(score, related.length);
    const reasons: string[] = [];

    if (related.length === 0) {
      reasons.push(
        "No recent tagged headlines — ranking leans on price/MA/macro only.",
      );
    } else {
      reasons.push(
        `${related.length} related headline${related.length === 1 ? "" : "s"} (finance + general/trending); ${velocity.recent} in last 24h.`,
      );
    }
    if (breakdown.newsTone >= 12)
      reasons.push("Headline tone skews constructive.");
    else if (breakdown.newsTone <= -12)
      reasons.push("Headline tone skews cautious.");
    else if (related.length > 0)
      reasons.push("Headline tone is mixed-to-neutral.");

    if (changePct != null) {
      reasons.push(
        `Price ${changePct >= 0 ? "bid" : "off"} ${Math.abs(changePct).toFixed(2)}% (live).`,
      );
    } else {
      reasons.push("Live quote unavailable.");
    }
    if (breakdown.maTrend >= 8)
      reasons.push("Price above short MAs / uptrend bias.");
    else if (breakdown.maTrend <= -8)
      reasons.push("Price below short MAs / softer trend.");
    if (macro.boost > 0) {
      reasons.push(
        `Macro calendar focus (+${macro.boost}): ${macro.labels.join("; ") || "regional events"}.`,
      );
    }
    reasons.push(`Suggested posture: ${actionLabel(action)}.`);

    return {
      symbol: inst.symbol,
      name: inst.name,
      sector: inst.sector,
      market: inst.market,
      currency: inst.currency,
      action,
      score,
      breakdown,
      reasons,
      mentionCount: related.length,
      changePct,
      lastPrice,
      quoteSource: quote ? "live" : null,
      topHeadlines: related.slice(0, 3).map((n) => n.title),
    };
  });

  ideas.sort((a, b) => b.score - a.score);

  void persistRankingSnapshots(ideas, market);

  const leaders = ideas.filter((i) => i.action === "lean_in").slice(0, 3);
  const laggards = ideas.filter((i) => i.action === "lean_out").slice(0, 2);
  const macroNote =
    macroEvents.length > 0
      ? `${macroEvents.filter((e) => e.impact === "high").length} high-impact macro events in the next window feed regional boosts.`
      : null;

  const marketNote = [
    leaders.length
      ? `Relative leaders on this pass: ${leaders.map((l) => l.symbol).join(", ")}.`
      : "No strong lean-in signals — mostly watch/needs-data.",
    laggards.length
      ? `Softer setups: ${laggards.map((l) => l.symbol).join(", ")}.`
      : null,
    macroNote,
    "Scores blend finance+general news tone, mention velocity, coverage, price, MA trend, range, and macro calendar focus.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    generatedAt: new Date().toISOString(),
    scope: input.scope,
    market,
    symbols: universe.map((u) => u.symbol),
    ideas,
    marketNote,
    disclaimer:
      "Not investment advice. Rankings are research heuristics over public headlines, quotes, and macro calendars.",
  };
}
