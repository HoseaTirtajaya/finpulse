import type { NewsCategory, NewsItem } from "@/lib/types";

export type FeedSource = {
  id: string;
  name: string;
  url: string;
  category: Exclude<NewsCategory, "all">;
};

/** Public RSS endpoints — may be blocked in some networks; fallbacks kick in. */
export const FEED_SOURCES: FeedSource[] = [
  {
    id: "yahoo-finance",
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    category: "markets",
  },
  {
    id: "cnbc-markets",
    name: "CNBC Markets",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258",
    category: "markets",
  },
  {
    id: "cnbc-economy",
    name: "CNBC Economy",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910261",
    category: "macro",
  },
  {
    id: "marketwatch-top",
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    category: "equities",
  },
];

const TICKER_PATTERN =
  /\b(AAPL|MSFT|NVDA|TSLA|AMZN|GOOGL|META|JPM|XOM|SPY|QQQ|BTC|BITCOIN|ETH|EUR\/?USD|GOLD|GLD|VIX)\b/gi;

const CATEGORY_HINTS: Record<Exclude<NewsCategory, "all">, RegExp> = {
  crypto: /\b(bitcoin|crypto|ethereum|btc|eth|digital asset|blockchain)\b/i,
  macro:
    /\b(fed|inflation|cpi|gdp|treasury|rates|economy|jobs|unemployment|ecb)\b/i,
  equities:
    /\b(stock|shares|earnings|ipo|nasdaq|dow|s&p|equity|buyback)\b/i,
  markets: /\b(market|rally|selloff|futures|wall street|trading)\b/i,
};

export function inferCategory(
  title: string,
  summary: string,
  fallback: Exclude<NewsCategory, "all">,
): Exclude<NewsCategory, "all"> {
  const text = `${title} ${summary}`;
  for (const key of ["crypto", "macro", "equities", "markets"] as const) {
    if (CATEGORY_HINTS[key].test(text)) return key;
  }
  return fallback;
}

export function extractTickers(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(TICKER_PATTERN)) {
    let t = match[0].toUpperCase();
    if (t === "BITCOIN" || t === "BTC") t = "BTC-USD";
    if (t === "EUR/USD" || t === "EURUSD") t = "EURUSD";
    if (t === "GOLD") t = "GLD";
    if (t === "VIX") t = "^VIX";
    found.add(t);
  }
  return Array.from(found);
}

export function slugId(source: string, title: string, link: string): string {
  const raw = `${source}|${link || title}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `n${Math.abs(hash)}`;
}

/** Curated demo corpus so the product always has rich, realistic content. */
export const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "fb-1",
    title: "S&P 500 firms as soft landing bets return after cooler inflation print",
    summary:
      "Investors rotated back into cyclicals and megacap tech after a softer-than-expected CPI reading revived rate-cut hopes. Futures pointed to a constructive open while the dollar eased.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    category: "markets",
    tickers: ["SPY", "QQQ"],
  },
  {
    id: "fb-2",
    title: "NVIDIA suppliers signal sustained AI server demand into next year",
    summary:
      "Component makers flagged healthy order books for high-bandwidth memory and networking gear, reinforcing the data-center spend thesis even as investors debate valuation.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    category: "equities",
    tickers: ["NVDA"],
  },
  {
    id: "fb-3",
    title: "Apple services revenue steadies narrative ahead of product cycle",
    summary:
      "Analysts highlighted resilient App Store and cloud attachment rates as a buffer if hardware upgrades slow. China demand remains the swing factor for the next quarter.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    category: "equities",
    tickers: ["AAPL"],
  },
  {
    id: "fb-4",
    title: "Treasury yields slip as traders lean into mid-year Fed easing",
    summary:
      "The 10-year yield edged lower after auction demand improved. Rate-sensitive growth names and gold both caught a bid as real yields compressed.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    category: "macro",
    tickers: ["GLD", "QQQ"],
  },
  {
    id: "fb-5",
    title: "Bitcoin holds above key levels as spot ETF flows turn positive again",
    summary:
      "Crypto desks noted a rebound in institutional creations after two weeks of outflows. Correlation with Nasdaq risk appetite stayed elevated.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    category: "crypto",
    tickers: ["BTC-USD", "QQQ"],
  },
  {
    id: "fb-6",
    title: "JPMorgan sees healthy capital markets pipeline into earnings season",
    summary:
      "Dealmakers pointed to a thaw in IPO and M&A calendars if volatility stays contained. Net interest income guidance remains the near-term focus for bank stocks.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    category: "equities",
    tickers: ["JPM"],
  },
  {
    id: "fb-7",
    title: "Oil steady as OPEC+ discipline offsets soft China demand signals",
    summary:
      "Crude futures traded in a tight range. Energy equities tracked refining margins more than the headline barrel price as traders waited on inventory data.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    category: "markets",
    tickers: ["XOM"],
  },
  {
    id: "fb-8",
    title: "Tesla delivery chatter splits Street ahead of quarterly report",
    summary:
      "Bulls lean on energy storage and autonomy optionality; bears focus on price cuts and margin compression. Options skew remains elevated into the print.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    category: "equities",
    tickers: ["TSLA"],
  },
  {
    id: "fb-9",
    title: "Euro softens as ECB speakers push back on aggressive cut pricing",
    summary:
      "EUR/USD drifted lower after policymakers stressed data dependence. Cross-asset desks watched for spillover into European bank equities.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    category: "macro",
    tickers: ["EURUSD", "JPM"],
  },
  {
    id: "fb-10",
    title: "VIX compresses as equity options desks lean into calm tape",
    summary:
      "Implied volatility fell toward cycle lows, cheapening hedges. Strategists warned that crowded short-vol positioning can reverse quickly on a macro surprise.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    category: "markets",
    tickers: ["^VIX", "SPY"],
  },
  {
    id: "fb-11",
    title: "Microsoft cloud growth keeps AI monetization story in focus",
    summary:
      "Azure commentary and Copilot attach rates remain the narrative drivers. Investors parse whether AI spend is converting into durable margin expansion.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    category: "equities",
    tickers: ["MSFT", "NVDA"],
  },
  {
    id: "fb-12",
    title: "Gold firms as real yields ease and geopolitical premium persists",
    summary:
      "Bullion caught a bid alongside rate-cut repricing. ETF creations improved, though traders still watch the dollar for confirmation.",
    url: "https://finance.yahoo.com/",
    source: "FinPulse Desk",
    publishedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    category: "macro",
    tickers: ["GLD"],
  },
];
