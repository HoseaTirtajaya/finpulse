import { unstable_cache } from "next/cache";
import { fetchNews } from "@/lib/news/fetch-news";
import { fetchCandles, fetchQuotes } from "@/lib/market";
import type { MarketFilter, NewsScope } from "@/lib/types";

export const getCachedNews = unstable_cache(
  async (args: {
    scope: NewsScope;
    category?: string;
    q?: string;
    symbol?: string;
    market?: MarketFilter;
  }) => fetchNews(args),
  ["finpulse-news"],
  { revalidate: 300, tags: ["news"] },
);

export const getCachedQuotes = unstable_cache(
  async (symbolsKey: string) => {
    const symbols = symbolsKey.split(",").filter(Boolean);
    return fetchQuotes(symbols);
  },
  ["finpulse-quotes"],
  { revalidate: 60, tags: ["quotes"] },
);

export const getCachedCandles = unstable_cache(
  async (symbol: string, range: string) => fetchCandles(symbol, range),
  ["finpulse-candles"],
  { revalidate: 300, tags: ["candles"] },
);
