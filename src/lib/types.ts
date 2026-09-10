export type NewsScope = "finance" | "general" | "trending";

export type MarketFilter = "all" | "US" | "ID";

export type FinanceCategory =
  | "markets"
  | "equities"
  | "macro"
  | "crypto"
  | "all";

export type GeneralCategory =
  | "world"
  | "tech"
  | "politics"
  | "sports"
  | "culture"
  | "all";

/** Union used by filters; finance and general categories share the chip UI. */
export type NewsCategory = FinanceCategory | GeneralCategory;

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  category: string;
  tickers: string[];
  scope: Exclude<NewsScope, "trending">;
  language?: "en" | "id";
  imageUrl?: string;
};

export type Instrument = {
  symbol: string;
  name: string;
  type: "equity" | "etf" | "index" | "crypto" | "fx";
  sector: string;
  description: string;
  market: "US" | "ID";
  currency: "USD" | "IDR";
  /** Yahoo Finance chart symbol */
  yahooSymbol: string;
  tags: string[];
  /** Alternate names for headline matching */
  aliases?: string[];
};

export type Quote = {
  symbol: string;
  price: number;
  changePct: number;
  currency?: string;
  asOf: string;
  source: "live";
};

export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type TrendSignal = {
  label: string;
  score: number;
  direction: "up" | "down" | "flat";
  mentionCount: number;
  relatedTickers: string[];
};

export type TrendCluster = {
  id: string;
  title: string;
  score: number;
  sourceCount: number;
  sources: string[];
  headlines: { title: string; source: string; url: string; publishedAt: string }[];
  mentionCount: number;
};

export type AiBrief = {
  instrumentSymbol?: string;
  scope?: NewsScope;
  headline: string;
  stance: "constructive" | "cautious" | "neutral" | "mixed";
  summary: string;
  bullets: string[];
  risks: string[];
  whatToWatch: string[];
  citedHeadlines: string[];
  disclaimer: string;
  model: "heuristic" | "gemini" | "openai" | "anthropic";
  generatedAt: string;
};

export type RecAction = "lean_in" | "watch" | "lean_out" | "needs_data";

export type ScoreBreakdown = {
  newsTone: number;
  mentionMomentum: number;
  priceAction: number;
  coverage: number;
  maTrend: number;
  rangePosition: number;
};

export type Recommendation = {
  symbol: string;
  name: string;
  sector: string;
  market: "US" | "ID";
  currency: "USD" | "IDR";
  action: RecAction;
  score: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  mentionCount: number;
  changePct: number | null;
  lastPrice: number | null;
  quoteSource: "live" | null;
  topHeadlines: string[];
};

export type RecommendationBundle = {
  generatedAt: string;
  scope: "watchlist" | "universe";
  symbols: string[];
  ideas: Recommendation[];
  marketNote: string;
  disclaimer: string;
};
