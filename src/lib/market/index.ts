import type { MarketDataProvider } from "@/lib/market/provider";
import { yahooProvider } from "@/lib/market/yahoo";
import type { Candle, Quote } from "@/lib/types";

export function getMarketProvider(): MarketDataProvider {
  const id = (process.env.MARKET_PROVIDER || "yahoo").toLowerCase();
  // Paid providers (finnhub / polygon) plug in here when keys exist.
  if (id === "finnhub" || id === "polygon") {
    // Fall back to Yahoo until those adapters ship — interface is ready.
    return yahooProvider;
  }
  return yahooProvider;
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  return getMarketProvider().getQuotes(symbols);
}

export async function fetchCandles(
  symbol: string,
  range = "1y",
): Promise<Candle[]> {
  return getMarketProvider().getCandles(symbol, range);
}
