import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import Parser from "rss-parser";
import type { Db } from "@/lib/db";
import { articles, sources } from "@/lib/db/schema";
import {
  articleDedupKey,
  mapPool,
  normalizeArticleUrl,
} from "@/lib/ingest/helpers";
import {
  markSourceSuccess,
  withinCadence,
} from "@/lib/ingest/sources";
import { FINANCE_SOURCES, inferFinanceCategory } from "@/lib/news/sources/finance";
import {
  GENERAL_SOURCES,
  inferGeneralCategory,
} from "@/lib/news/sources/general";
import {
  extractTickers,
  slugId,
} from "@/lib/news/sources/shared";
import { stripHtml } from "@/lib/news/text";
import type { FeedSource } from "@/lib/news/sources/finance";

const RSS_CADENCE_MS = 15 * 60 * 1000;
const FEED_CONCURRENCY = 8;

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "FinPulse/0.4 (+https://localhost; research aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

function hashRaw(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

async function fetchFeedItems(
  source: FeedSource,
  scope: "finance" | "general",
) {
  const feed = await parser.parseURL(source.url);
  return (feed.items ?? [])
    .filter((item) => item.title && (item.link || item.guid))
    .slice(0, 18)
    .map((item) => {
      const title = stripHtml(item.title ?? "");
      const summary = stripHtml(
        item.contentSnippet || item.summary || item.content || "",
      ).slice(0, 360);
      const urlLink = normalizeArticleUrl(item.link || item.guid || "#");
      const publishedAt = item.isoDate
        ? new Date(item.isoDate)
        : item.pubDate
          ? new Date(item.pubDate)
          : new Date();
      const category =
        scope === "finance"
          ? inferFinanceCategory(title, summary, source.category)
          : inferGeneralCategory(title, summary, source.category);
      const market =
        source.market ?? (source.language === "id" ? "ID" : "global");
      return {
        id: slugId(source.id, title, urlLink),
        sourceId: source.id,
        title,
        summary: summary || "Open the article for full context.",
        url: urlLink,
        publishedAt,
        scope,
        category,
        market,
        language: source.language,
        tickers:
          scope === "finance" ? extractTickers(`${title} ${summary}`) : [],
        rawHash: hashRaw(`${title}|${urlLink}|${publishedAt.toISOString()}`),
      };
    });
}

export type AdapterResult = {
  ok: number;
  fail: number;
  errors: { source: string; message: string }[];
};

function dedupeFeedItems<T extends { url: string; title: string }>(
  items: T[],
): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    const key = articleDedupKey(item.url, item.title);
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

async function upsertArticlesBatch(
  db: Db,
  items: Awaited<ReturnType<typeof fetchFeedItems>>,
): Promise<void> {
  if (items.length === 0) return;
  const unique = dedupeFeedItems(items);
  // Neon HTTP: chunk to stay under payload limits
  const CHUNK = 40;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    await db
      .insert(articles)
      .values(chunk)
      .onConflictDoUpdate({
        target: articles.url,
        set: {
          title: sql`excluded.title`,
          summary: sql`excluded.summary`,
          publishedAt: sql`excluded.published_at`,
          category: sql`excluded.category`,
          market: sql`excluded.market`,
          language: sql`excluded.language`,
          tickers: sql`excluded.tickers`,
          rawHash: sql`excluded.raw_hash`,
          ingestedAt: new Date(),
          sourceId: sql`excluded.source_id`,
          scope: sql`excluded.scope`,
        },
      });
  }
}

export async function ingestRss(db: Db): Promise<AdapterResult> {
  const result: AdapterResult = { ok: 0, fail: 0, errors: [] };
  const registry = [
    ...FINANCE_SOURCES.map((s) => ({ source: s, scope: "finance" as const })),
    ...GENERAL_SOURCES.map((s) => ({ source: s, scope: "general" as const })),
  ];

  const existing = await db.select().from(sources);
  const lastById = new Map(
    existing.map((r) => [r.id, r.lastSuccessAt] as const),
  );

  const due = registry.filter(
    ({ source }) => !withinCadence(lastById.get(source.id), RSS_CADENCE_MS),
  );

  await mapPool(due, FEED_CONCURRENCY, async ({ source, scope }) => {
    try {
      const items = await fetchFeedItems(source, scope);
      // Empty feed is success (source reachable), not a failure.
      await upsertArticlesBatch(db, items);
      await markSourceSuccess(db, source.id);
      result.ok += 1;
    } catch (err) {
      result.fail += 1;
      result.errors.push({
        source: source.name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return result;
}

/** Exported for live fallback path (no DB). */
export { fetchFeedItems, stripHtml };
