import { getCachedCandles } from "@/lib/cache";
import { loadDailyBarsForSymbol } from "@/lib/db/market-data";
import type { Candle } from "@/lib/types";

export const CANDLE_RANGES = ["1mo", "3mo", "1y", "5y"] as const;
export type CandleRange = (typeof CANDLE_RANGES)[number];

/** Map UI range → lookback days for DB queries. */
export function rangeToDays(range: CandleRange): number {
  switch (range) {
    case "1mo":
      return 30;
    case "3mo":
      return 90;
    case "1y":
      return 365;
    case "5y":
      return 1825;
  }
}

export function isCandleRange(value: string): value is CandleRange {
  return (CANDLE_RANGES as readonly string[]).includes(value);
}

/**
 * True when a meaningful share of bars have real high/low spread
 * (Yahoo OHLCV). CoinGecko-style close-only bars fail this check.
 */
export function detectHasOhlc(candles: Candle[]): boolean {
  if (candles.length < 5) return false;
  let spread = 0;
  for (const c of candles) {
    if (c.high > c.low) spread += 1;
  }
  return spread / candles.length >= 0.5;
}

export type LoadCandlesResult = {
  candles: Candle[];
  hasOhlc: boolean;
  source: "db" | "live";
  range: CandleRange;
};

/**
 * Prefer persisted daily_bars when enough history exists; otherwise
 * fall back to live Yahoo / CoinGecko via getCachedCandles.
 */
export async function loadCandlesForSymbol(
  symbol: string,
  range: CandleRange = "1y",
): Promise<LoadCandlesResult> {
  const days = rangeToDays(range);
  const fromDb = await loadDailyBarsForSymbol(symbol, days);
  if (fromDb.length >= 20) {
    return {
      candles: fromDb,
      hasOhlc: detectHasOhlc(fromDb),
      source: "db",
      range,
    };
  }

  const live = await getCachedCandles(symbol, range);
  return {
    candles: live,
    hasOhlc: detectHasOhlc(live),
    source: "live",
    range,
  };
}
