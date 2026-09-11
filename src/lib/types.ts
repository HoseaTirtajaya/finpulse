export type NewsScope = "finance" | "general" | "trending";

/** Finance: all | US | ID. General: all | world | ID. */
export type MarketFilter = "all" | "US" | "ID" | "world";

export type FeedMarket = "US" | "ID" | "global";

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
  /** Region of the originating feed */
  market?: FeedMarket;
  imageUrl?: string;
};

export type Instrument = {
  symbol: string;
  name: string;
  type: "equity" | "etf" | "index" | "crypto" | "fx";
  sector: string;
  description: string;
  market: "US" | "EU" | "ID" | "Asia" | "global";
  currency: "USD" | "IDR" | "EUR" | "JPY" | "HKD";
  /** Yahoo Finance chart symbol */
  yahooSymbol: string;
  /** CoinGecko coin id for crypto quotes / rankings */
  coingeckoId?: string;
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
  marketCap?: number;
  volume24h?: number;
  rank?: number;
};

/** CoinGecko /coins/markets row normalized for the crypto desk */
export type CryptoMarketRow = {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  changePct24h: number;
  marketCap: number;
  volume24h: number;
  sparkline7d?: number[];
  imageUrl?: string;
  coingeckoId: string;
  /** FinPulse instrument symbol when catalogued */
  instrumentSymbol?: string;
  asOf: string;
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

/** World and Indonesia ranked independently — never mixed. */
export type TrendClusterLanes = {
  world: TrendCluster[];
  indonesia: TrendCluster[];
};

export type AiBrief = {
  instrumentSymbol?: string;
  scope?: NewsScope;
  headline: string;
  stance: "constructive" | "cautious" | "neutral" | "mixed";
  summary: string;
  /** Key drivers / thesis points from coverage */
  bullets: string[];
  risks: string[];
  whatToWatch: string[];
  /**
   * Probable paths if someone already holds or is considering the name —
   * bull / base / bear style, framed as scenarios not forecasts.
   */
  scenarios?: string[];
  /** Conditions that favor patience vs engagement (not a trade timer) */
  timing?: string[];
  /** Practical checks a retail investor should verify before acting */
  investorChecks?: string[];
  /**
   * Leverage / margin framing: how outcomes amplify, liquidation risk,
   * and when leveraged exposure is usually a poor fit — not a leverage call.
   */
  leverageTrading?: string[];
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
  /** Light boost from upcoming high/medium macro events in this region */
  macroBoost: number;
};

export type Recommendation = {
  symbol: string;
  name: string;
  sector: string;
  market: "US" | "EU" | "ID" | "Asia" | "global";
  currency: "USD" | "IDR" | "EUR" | "JPY" | "HKD";
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
  market: RecMarketSegment;
  symbols: string[];
  ideas: Recommendation[];
  marketNote: string;
  disclaimer: string;
};

/** Filter chip for recommendations desk */
export type RecMarketSegment =
  | "all"
  | "US"
  | "EU"
  | "ID"
  | "Asia"
  | "global"
  | "crypto";
