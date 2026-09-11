import { and, eq, gte, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import {
  articleInstruments,
  articles,
  instruments,
} from "@/lib/db/schema";
import { matchesInstrument } from "@/lib/news/match-instrument";
import type { NewsItem } from "@/lib/types";

type CatalogRow = {
  symbol: string;
  name: string;
  aliases: string[];
};

async function loadCatalog(db: Db): Promise<CatalogRow[]> {
  const rows = await db
    .select({
      symbol: instruments.symbol,
      name: instruments.name,
    })
    .from(instruments)
    .where(eq(instruments.enabled, true));

  // Prefer DB catalog; fall back to static TS catalog if empty.
  if (rows.length === 0) {
    const { INSTRUMENTS } = await import("@/lib/instruments");
    return INSTRUMENTS.map((i) => ({
      symbol: i.symbol,
      name: i.name,
      aliases: i.aliases ?? [],
    }));
  }

  const { instrumentAliases } = await import("@/lib/db/schema");
  const aliases = await db
    .select({
      symbol: instrumentAliases.symbol,
      alias: instrumentAliases.alias,
    })
    .from(instrumentAliases);

  const bySym = new Map<string, string[]>();
  for (const a of aliases) {
    const list = bySym.get(a.symbol) ?? [];
    list.push(a.alias);
    bySym.set(a.symbol, list);
  }

  return rows.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    aliases: bySym.get(r.symbol) ?? [],
  }));
}

function rowToNewsItem(row: {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
  category: string;
  tickers: string[] | null;
  scope: string;
  language: string | null;
  market: string | null;
}): NewsItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    url: row.url,
    source: "",
    publishedAt: row.publishedAt.toISOString(),
    category: row.category,
    tickers: row.tickers ?? [],
    scope: row.scope as "finance" | "general",
    language: (row.language as "en" | "id" | undefined) ?? undefined,
    market: (row.market as NewsItem["market"]) ?? undefined,
  };
}

/**
 * Link recent finance articles to instruments via matchesInstrument.
 * Idempotent upsert on (article_id, symbol).
 */
export async function linkArticleInstruments(
  db: Db,
  options?: { lookbackHours?: number; limit?: number },
): Promise<{ linked: number; scanned: number }> {
  const lookbackHours = options?.lookbackHours ?? 48;
  const limit = options?.limit ?? 400;
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

  const catalog = await loadCatalog(db);
  if (catalog.length === 0) return { linked: 0, scanned: 0 };

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      summary: articles.summary,
      url: articles.url,
      publishedAt: articles.publishedAt,
      category: articles.category,
      tickers: articles.tickers,
      scope: articles.scope,
      language: articles.language,
      market: articles.market,
    })
    .from(articles)
    .where(
      and(eq(articles.scope, "finance"), gte(articles.publishedAt, since)),
    )
    .orderBy(sql`${articles.publishedAt} desc`)
    .limit(limit);

  const links: { articleId: string; symbol: string; confidence: string }[] =
    [];
  for (const row of rows) {
    const item = rowToNewsItem(row);
    for (const inst of catalog) {
      if (matchesInstrument(item, inst.symbol, inst.name, inst.aliases)) {
        links.push({
          articleId: row.id,
          symbol: inst.symbol,
          confidence: "1",
        });
      }
    }
  }

  if (links.length === 0) return { linked: 0, scanned: rows.length };

  // Drop stale links for these articles, then insert fresh set.
  const articleIds = Array.from(new Set(links.map((l) => l.articleId)));
  const CHUNK = 50;
  for (let i = 0; i < articleIds.length; i += CHUNK) {
    await db
      .delete(articleInstruments)
      .where(inArray(articleInstruments.articleId, articleIds.slice(i, i + CHUNK)));
  }

  for (let i = 0; i < links.length; i += CHUNK) {
    await db
      .insert(articleInstruments)
      .values(links.slice(i, i + CHUNK))
      .onConflictDoNothing();
  }

  return { linked: links.length, scanned: rows.length };
}
