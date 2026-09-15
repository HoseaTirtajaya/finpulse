import { cacheLife, cacheTag } from "next/cache";
import { fetchNews } from "@/lib/news/query-news";
import { queryMacroEvents } from "@/lib/news/query-news";
import {
  getMacroEventDayMarkers,
  queryMacroEventsForDay,
  queryMacroEventsForMonth,
} from "@/lib/macro/query-calendar";
import { fetchCandles, fetchCryptoMarkets, fetchQuotes } from "@/lib/market";
import type { MarketFilter, NewsScope } from "@/lib/types";

export async function getCachedNews(args: {
  scope: NewsScope;
  category?: string;
  q?: string;
  symbol?: string;
  market?: MarketFilter;
}) {
  "use cache";
  cacheLife("news");
  cacheTag("news");
  return fetchNews(args);
}

export async function getCachedMacroEvents() {
  "use cache";
  cacheLife("macro");
  cacheTag("macro");
  return queryMacroEvents({
    hoursAhead: 48,
    minImpact: "medium",
    limit: 10,
  });
}

export async function getCachedMacroEventsForDay(isoDate: string) {
  "use cache";
  cacheLife("macro");
  cacheTag("macro");
  return queryMacroEventsForDay(isoDate, { minImpact: "low", limit: 200 });
}

export async function getCachedMacroMonth(year: number, month: number) {
  "use cache";
  cacheLife("macro");
  cacheTag("macro");
  const [markers, events] = await Promise.all([
    getMacroEventDayMarkers(year, month),
    queryMacroEventsForMonth(year, month),
  ]);
  return { markers, events };
}

export async function getCachedQuotes(symbolsKey: string) {
  "use cache";
  cacheLife("quotes");
  cacheTag("quotes");
  const symbols = symbolsKey
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort();
  return fetchQuotes(symbols);
}

export async function getCachedCandles(symbol: string, range: string) {
  "use cache";
  cacheLife("candles");
  cacheTag("candles");
  return fetchCandles(symbol, range);
}

export async function getCachedCryptoMarkets(limit = 50) {
  "use cache";
  cacheLife("crypto");
  cacheTag("crypto-markets");
  return fetchCryptoMarkets(limit);
}
