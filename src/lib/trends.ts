import type { NewsItem, TrendSignal } from "@/lib/types";

const THEMES: { label: string; pattern: RegExp; tickers: string[] }[] = [
  {
    label: "AI / Semiconductors",
    pattern: /\b(ai|nvidia|semiconductor|gpu|data.?center|chip)\b/i,
    tickers: ["NVDA", "MSFT"],
  },
  {
    label: "Fed & Rates",
    pattern: /\b(fed|rate.?cut|treasury|yield|cpi|inflation)\b/i,
    tickers: ["SPY", "GLD", "QQQ"],
  },
  {
    label: "Megacap Tech",
    pattern: /\b(apple|microsoft|nasdaq|megacap|big tech)\b/i,
    tickers: ["AAPL", "MSFT", "QQQ"],
  },
  {
    label: "Crypto Liquidity",
    pattern: /\b(bitcoin|crypto|etf flow|btc|ethereum)\b/i,
    tickers: ["BTC-USD"],
  },
  {
    label: "Energy & Commodities",
    pattern: /\b(oil|crude|opec|gold|commodity)\b/i,
    tickers: ["XOM", "GLD"],
  },
  {
    label: "Banks & Credit",
    pattern: /\b(bank|jpmorgan|credit|loan|ipo|m&a)\b/i,
    tickers: ["JPM"],
  },
  {
    label: "Volatility / Risk",
    pattern: /\b(vix|volatility|selloff|risk.?off|hedge)\b/i,
    tickers: ["^VIX", "SPY"],
  },
];

const POSITIVE = /\b(rally|surge|gain|beat|hope|strong|rebound|bid|firm)\b/i;
const NEGATIVE = /\b(fall|drop|cut|slow|weak|risk|warn|soft|pressure|loss)\b/i;

export function buildTrendSignals(items: NewsItem[]): TrendSignal[] {
  return THEMES.map((theme) => {
    const matches = items.filter((i) =>
      theme.pattern.test(`${i.title} ${i.summary}`),
    );
    let tone = 0;
    for (const m of matches) {
      const text = `${m.title} ${m.summary}`;
      if (POSITIVE.test(text)) tone += 1;
      if (NEGATIVE.test(text)) tone -= 1;
    }
    const score = matches.length
      ? Math.max(-100, Math.min(100, Math.round((tone / matches.length) * 100)))
      : 0;
    const direction: TrendSignal["direction"] =
      score > 15 ? "up" : score < -15 ? "down" : "flat";
    return {
      label: theme.label,
      score,
      direction,
      mentionCount: matches.length,
      relatedTickers: theme.tickers,
    };
  })
    .filter((t) => t.mentionCount > 0)
    .sort((a, b) => b.mentionCount - a.mentionCount || Math.abs(b.score) - Math.abs(a.score));
}
