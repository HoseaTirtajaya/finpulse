import { getInstrument, INSTRUMENTS } from "@/lib/instruments";
import type {
  NewsItem,
  Quote,
  RecAction,
  Recommendation,
  RecommendationBundle,
  ScoreBreakdown,
} from "@/lib/types";

const POSITIVE =
  /\b(rally|surge|gain|beat|hope|strong|rebound|bid|firm|growth|demand)\b/i;
const NEGATIVE =
  /\b(fall|drop|cut|slow|weak|risk|warn|soft|pressure|loss|fade|miss)\b/i;

function matchesInstrument(
  item: NewsItem,
  symbol: string,
  name: string,
): boolean {
  const key = symbol.toUpperCase().replace("-USD", "").replace("^", "");
  const nameToken = name.split(/[\s,]+/)[0];
  if (item.tickers.some((t) => t.toUpperCase() === symbol.toUpperCase())) {
    return true;
  }
  const blob = `${item.title} ${item.summary}`.toUpperCase();
  if (blob.includes(key)) return true;
  if (nameToken.length > 3 && blob.includes(nameToken.toUpperCase())) {
    return true;
  }
  return false;
}

function toneScore(items: NewsItem[]): number {
  if (items.length === 0) return 0;
  let tone = 0;
  for (const item of items) {
    const text = `${item.title} ${item.summary}`;
    if (POSITIVE.test(text)) tone += 1;
    if (NEGATIVE.test(text)) tone -= 1;
  }
  return Math.max(-40, Math.min(40, Math.round((tone / items.length) * 40)));
}

function priceScore(changePct: number): number {
  return Math.max(-20, Math.min(20, Math.round(changePct * 4)));
}

function mentionScore(count: number, maxCount: number): number {
  if (maxCount <= 0) return 0;
  return Math.round((count / maxCount) * 25);
}

function coverageScore(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 6;
  if (count === 2) return 10;
  return 15;
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

export function rankRecommendations(input: {
  symbols: string[];
  news: NewsItem[];
  quotes: Quote[];
  scope: "watchlist" | "universe";
}): RecommendationBundle {
  const quoteMap = new Map(
    input.quotes.map((q) => [q.symbol.toUpperCase(), q]),
  );

  const universe =
    input.symbols.length > 0
      ? input.symbols
          .map((s) => getInstrument(s))
          .filter((i): i is NonNullable<typeof i> => Boolean(i))
      : INSTRUMENTS;

  const relatedCounts = universe.map(
    (inst) =>
      input.news.filter((n) => matchesInstrument(n, inst.symbol, inst.name))
        .length,
  );
  const maxMentions = Math.max(0, ...relatedCounts);

  const ideas: Recommendation[] = universe.map((inst) => {
    const related = input.news.filter((n) =>
      matchesInstrument(n, inst.symbol, inst.name),
    );
    const quote = quoteMap.get(inst.symbol.toUpperCase());
    const changePct = quote?.changePct ?? inst.changePct;
    const lastPrice = quote?.price ?? inst.lastPrice;
    const quoteSource = quote?.source ?? "demo";

    const breakdown: ScoreBreakdown = {
      newsTone: toneScore(related),
      mentionMomentum: mentionScore(related.length, maxMentions),
      priceAction: priceScore(changePct),
      coverage: coverageScore(related.length),
    };

    const score =
      breakdown.newsTone +
      breakdown.mentionMomentum +
      breakdown.priceAction +
      breakdown.coverage;

    const action = pickAction(score, related.length);
    const reasons: string[] = [];

    if (related.length === 0) {
      reasons.push("No recent tagged headlines — ranking is price-only / thin.");
    } else {
      reasons.push(
        `${related.length} related headline${related.length === 1 ? "" : "s"} in the current feed.`,
      );
    }
    if (breakdown.newsTone >= 12) {
      reasons.push("Headline tone skews constructive.");
    } else if (breakdown.newsTone <= -12) {
      reasons.push("Headline tone skews cautious.");
    } else if (related.length > 0) {
      reasons.push("Headline tone is mixed-to-neutral.");
    }
    if (Math.abs(changePct) >= 1) {
      reasons.push(
        `Price action ${changePct >= 0 ? "bid" : "off"} ${Math.abs(changePct).toFixed(2)}% (${quoteSource}).`,
      );
    } else {
      reasons.push(`Price nearly flat (${quoteSource} quote).`);
    }
    reasons.push(`Suggested posture: ${actionLabel(action)}.`);

    return {
      symbol: inst.symbol,
      name: inst.name,
      sector: inst.sector,
      action,
      score,
      breakdown,
      reasons,
      mentionCount: related.length,
      changePct,
      lastPrice,
      quoteSource,
      topHeadlines: related.slice(0, 3).map((n) => n.title),
    };
  });

  ideas.sort((a, b) => b.score - a.score);

  const leaders = ideas.filter((i) => i.action === "lean_in").slice(0, 3);
  const laggards = ideas.filter((i) => i.action === "lean_out").slice(0, 2);

  const marketNote = [
    leaders.length
      ? `Relative leaders on this pass: ${leaders.map((l) => l.symbol).join(", ")}.`
      : "No strong lean-in signals — the board is mostly watch/needs-data.",
    laggards.length
      ? `Softer setups: ${laggards.map((l) => l.symbol).join(", ")}.`
      : null,
    "Scores blend news tone, mention share, coverage depth, and short-term price action.",
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
      "Not investment advice. Rankings are research heuristics over public headlines and quotes. They can be wrong, delayed, or incomplete — verify before any decision.",
  };
}
