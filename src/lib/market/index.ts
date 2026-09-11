import { getInstrument } from "@/lib/instruments";
import {
  coingeckoProvider,
  fetchCryptoMarkets as fetchCgMarkets,
} from "@/lib/market/coingecko";
import type { MarketDataProvider } from "@/lib/market/provider";
import { yahooProvider } from "@/lib/market/yahoo";
import type { Candle, CryptoMarketRow, Quote } from "@/lib/types";

/** Equities / FX / indices use Yahoo. Crypto always routes to CoinGecko. */
export function getMarketProvider(): MarketDataProvider {
  return yahooProvider;
}

function isCryptoSymbol(symbol: string): boolean {
  return getInstrument(symbol)?.type === "crypto";
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const crypto: string[] = [];
  const other: string[] = [];
  for (const s of symbols) {
    if (isCryptoSymbol(s)) crypto.push(s);
    else other.push(s);
  }

  const [cg, yahoo] = await Promise.all([
    crypto.length ? coingeckoProvider.getQuotes(crypto) : Promise.resolve([]),
    other.length ? getMarketProvider().getQuotes(other) : Promise.resolve([]),
  ]);

  // Preserve request order
  const bySym = new Map<string, Quote>();
  for (const q of [...cg, ...yahoo]) bySym.set(q.symbol, q);
  return symbols.map((s) => bySym.get(s)).filter((q): q is Quote => Boolean(q));
}

export async function fetchCandles(
  symbol: string,
  range = "1y",
): Promise<Candle[]> {
  if (isCryptoSymbol(symbol)) {
    return coingeckoProvider.getCandles(symbol, range);
  }
  return getMarketProvider().getCandles(symbol, range);
}

export async function fetchCryptoMarkets(
  limit = 50,
): Promise<CryptoMarketRow[]> {
  return fetchCgMarkets(limit);
}
