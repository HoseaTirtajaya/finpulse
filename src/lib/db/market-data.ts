import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import {
  articleInstruments,
  articles,
  dailyBars,
} from "@/lib/db/schema";
import type { Candle, NewsItem } from "@/lib/types";

/** Load up to `days` of daily bars for many symbols in one query. */
export async function loadDailyBarsForSymbols(
  symbols: string[],
  days = 280,
): Promise<Map<string, Candle[]>> {
  const map = new Map<string, Candle[]>();
  if (symbols.length === 0 || !hasDatabase()) return map;

  try {
    const db = getDb();
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const rows = await db
      .select({
        symbol: dailyBars.symbol,
        barDate: dailyBars.barDate,
        open: dailyBars.open,
        high: dailyBars.high,
        low: dailyBars.low,
        close: dailyBars.close,
        volume: dailyBars.volume,
      })
      .from(dailyBars)
      .where(
        and(
          inArray(dailyBars.symbol, symbols),
          gte(dailyBars.barDate, sinceStr),
        ),
      )
      .orderBy(dailyBars.symbol, dailyBars.barDate);

    for (const r of rows) {
      const list = map.get(r.symbol) ?? [];
      list.push({
        date: String(r.barDate),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume ?? undefined,
      });
      map.set(r.symbol, list);
    }
  } catch (err) {
    console.error("loadDailyBarsForSymbols failed", err);
  }
  return map;
}

/**
 * Mentions + headlines from article_instruments for a universe.
 * Falls back to empty map when DB/links unavailable.
 */
export async function loadLinkedNewsBySymbol(
  symbols: string[],
  lookbackHours = 168,
): Promise<Map<string, NewsItem[]>> {
  const map = new Map<string, NewsItem[]>();
  if (symbols.length === 0 || !hasDatabase()) return map;

  try {
    const db = getDb();
    const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
    const rows = await db
      .select({
        symbol: articleInstruments.symbol,
        id: articles.id,
        title: articles.title,
        publishedAt: articles.publishedAt,
        summary: articles.summary,
        url: articles.url,
        category: articles.category,
        tickers: articles.tickers,
        scope: articles.scope,
        language: articles.language,
        market: articles.market,
      })
      .from(articleInstruments)
      .innerJoin(articles, eq(articleInstruments.articleId, articles.id))
      .where(
        and(
          inArray(articleInstruments.symbol, symbols),
          gte(articles.publishedAt, since),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(2000);

    for (const r of rows) {
      const list = map.get(r.symbol) ?? [];
      list.push({
        id: r.id,
        title: r.title,
        summary: r.summary,
        url: r.url,
        source: "",
        publishedAt: r.publishedAt.toISOString(),
        category: r.category,
        tickers: r.tickers ?? [],
        scope: r.scope as "finance" | "general",
        language: (r.language as "en" | "id" | undefined) ?? undefined,
        market: (r.market as NewsItem["market"]) ?? undefined,
      });
      map.set(r.symbol, list);
    }
  } catch (err) {
    console.error("loadLinkedNewsBySymbol failed", err);
  }
  return map;
}
