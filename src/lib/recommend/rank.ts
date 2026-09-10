import { getInstrument, INSTRUMENTS } from "@/lib/instruments";
import { getCachedCandles } from "@/lib/cache";
import { toneScoreFromItems } from "@/lib/sentiment";
import type {
  Candle,
  NewsItem,
  Quote,
  RecAction,
  Recommendation,
  RecommendationBundle,
  ScoreBreakdown,
} from "@/lib/types";

function matchesInstrument(
  item: NewsItem,
  symbol: string,
  name: string,
  aliases?: string[],
): boolean {
  const key = symbol.toUpperCase().replace("-USD", "").replace("^", "");
  if (item.tickers.some((t) => t.toUpperCase() === symbol.toUpperCase())) {
    return true;
  }
  const blob = `${item.title} ${item.summary}`.toUpperCase();
  if (blob.includes(key)) return true;
  const nameToken = name.split(/[\s,]+/)[0];
  if (nameToken.length > 3 && blob.includes(nameToken.toUpperCase())) {
    return true;
  }
  for (const a of aliases ?? []) {
    if (a.length > 2 && blob.includes(a.toUpperCase())) return true;
  }
  return false;
}

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
  const pos = (last - lo) / (hi - lo); // 0..1
  // Mid-range neutral; near highs slightly constructive; near lows cautious
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

/** Mentions in last 24h vs prior 6 days — velocity bonus. */
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
      : Math.max(-10, Math.min(10, Math.round(((recent - baseline) / Math.max(baseline, 0.5)) * 5)));
  return { recent, prior, bonus };
}

function pickAction(score: number, mentionCount: number): RecAction {
  if (mentionCount === 0) return "needs_data";
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

export async function rankRecommendations(input: {
  symbols: string[];
  news: NewsItem[];
  quotes: Quote[];
  scope: "watchlist" | "universe";
}): Promise<RecommendationBundle> {
  const quoteMap = new Map(
    input.quotes.map((q) => [q.symbol.toUpperCase(), q]),
  );

  const universe =
    input.symbols.length > 0
      ? input.symbols
          .map((s) => getInstrument(s))
          .filter((i): i is NonNullable<typeof i> => Boolean(i))
      : INSTRUMENTS;

  const relatedLists = universe.map((inst) =>
    input.news.filter((n) =>
      matchesInstrument(n, inst.symbol, inst.name, inst.aliases),
    ),
  );
  const maxMentions = Math.max(0, ...relatedLists.map((r) => r.length));

  const candleEntries = await Promise.all(
    universe.map(async (inst) => {
      try {
        const candles = await getCachedCandles(inst.symbol, "1y");
        return [inst.symbol, candles] as const;
      } catch {
        return [inst.symbol, [] as Candle[]] as const;
      }
    }),
  );
  const candleMap = new Map(candleEntries);

  const ideas: Recommendation[] = universe.map((inst, idx) => {
    const related = relatedLists[idx];
    const quote = quoteMap.get(inst.symbol.toUpperCase());
    const changePct = quote?.changePct ?? null;
    const lastPrice = quote?.price ?? null;
    const candles = candleMap.get(inst.symbol) ?? [];
    const velocity = mentionVelocity(related);

    const breakdown: ScoreBreakdown = {
      newsTone: toneScoreFromItems(related),
      mentionMomentum:
        mentionScore(related.length, maxMentions) + velocity.bonus,
      priceAction: priceScore(changePct),
      coverage: coverageScore(related.length),
      maTrend: maTrendScore(candles),
      rangePosition: rangePositionScore(candles),
    };

    const score =
      breakdown.newsTone +
      breakdown.mentionMomentum +
      breakdown.priceAction +
      breakdown.coverage +
      breakdown.maTrend +
      breakdown.rangePosition;

    const action = pickAction(score, related.length);
    const reasons: string[] = [];

    if (related.length === 0) {
      reasons.push("No recent tagged headlines — ranking is price/MA only or thin.");
    } else {
      reasons.push(
        `${related.length} related headline${related.length === 1 ? "" : "s"}; ${velocity.recent} in last 24h.`,
      );
    }
    if (breakdown.newsTone >= 12) reasons.push("Headline tone skews constructive.");
    else if (breakdown.newsTone <= -12) reasons.push("Headline tone skews cautious.");
    else if (related.length > 0) reasons.push("Headline tone is mixed-to-neutral.");

    if (changePct != null) {
      reasons.push(
        `Price ${changePct >= 0 ? "bid" : "off"} ${Math.abs(changePct).toFixed(2)}% (live).`,
      );
    } else {
      reasons.push("Live quote unavailable.");
    }
    if (breakdown.maTrend >= 8) reasons.push("Price above short MAs / uptrend bias.");
    else if (breakdown.maTrend <= -8) reasons.push("Price below short MAs / softer trend.");
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

  const leaders = ideas.filter((i) => i.action === "lean_in").slice(0, 3);
  const laggards = ideas.filter((i) => i.action === "lean_out").slice(0, 2);

  const marketNote = [
    leaders.length
      ? `Relative leaders on this pass: ${leaders.map((l) => l.symbol).join(", ")}.`
      : "No strong lean-in signals — mostly watch/needs-data.",
    laggards.length
      ? `Softer setups: ${laggards.map((l) => l.symbol).join(", ")}.`
      : null,
    "Scores blend news tone, mention velocity, coverage, short-term price, MA trend, and 52-week range position.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    generatedAt: new Date().toISOString(),
    scope: input.scope,
    symbols: universe.map((u) => u.symbol),
    ideas,
    marketNote,
    disclaimer:
      "Not investment advice. Rankings are research heuristics over public headlines and quotes.",
  };
}
