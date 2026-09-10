import type { Candle, Quote } from "@/lib/types";

export type MarketDataProvider = {
  id: string;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getCandles(symbol: string, range?: string): Promise<Candle[]>;
};
