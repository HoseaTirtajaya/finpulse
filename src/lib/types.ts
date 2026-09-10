export type NewsCategory =
  | "markets"
  | "equities"
  | "macro"
  | "crypto"
  | "all";

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  category: Exclude<NewsCategory, "all">;
  tickers: string[];
  imageUrl?: string;
};

export type Instrument = {
  symbol: string;
  name: string;
  type: "equity" | "etf" | "index" | "crypto" | "fx";
  sector: string;
  description: string;
  lastPrice: number;
  changePct: number;
  tags: string[];
};

export type Quote = {
  symbol: string;
  price: number;
  changePct: number;
  currency?: string;
  asOf: string;
  source: "live" | "demo";
};

export type TrendSignal = {
  label: string;
  score: number;
  direction: "up" | "down" | "flat";
  mentionCount: number;
  relatedTickers: string[];
};

export type AiBrief = {
  instrumentSymbol?: string;
  headline: string;
  stance: "constructive" | "cautious" | "neutral" | "mixed";
  summary: string;
  bullets: string[];
  risks: string[];
  whatToWatch: string[];
  disclaimer: string;
  model: "heuristic" | "llm";
  generatedAt: string;
};

export type RecAction = "lean_in" | "watch" | "lean_out" | "needs_data";

export type ScoreBreakdown = {
  newsTone: number;
  mentionMomentum: number;
  priceAction: number;
  coverage: number;
};

export type Recommendation = {
  symbol: string;
  name: string;
  sector: string;
  action: RecAction;
  score: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
  mentionCount: number;
  changePct: number;
  lastPrice: number;
  quoteSource: "live" | "demo";
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
