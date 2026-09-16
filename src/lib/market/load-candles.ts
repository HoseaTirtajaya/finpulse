import { getCachedCandles } from "@/lib/cache";
import { loadDailyBarsForSymbol } from "@/lib/db/market-data";
import {
  detectHasOhlc,
  rangeToDays,
  type CandleRange,
} from "@/lib/market/candle-range";

export type {
  CandleRange,
} from "@/lib/market/candle-range";
export {
  CANDLE_RANGES,
  detectHasOhlc,
  isCandleRange,
  rangeToDays,
} from "@/lib/market/candle-range";

export type LoadCandlesResult = {
  candles: import("@/lib/types").Candle[];
  hasOhlc: boolean;
  source: "db" | "live";
  range: CandleRange;
};

/**
 * Prefer persisted daily_bars when enough history exists; otherwise
 * fall back to live Yahoo / CoinGecko via getCachedCandles.
 * Server-only — imports "use cache" helpers; do not import from Client Components.
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
