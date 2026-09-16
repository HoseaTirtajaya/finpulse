import { and, asc, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import {
  articleInstruments,
  articles,
  macroEvents,
  sources,
} from "@/lib/db/schema";
import type { MacroEventRow } from "@/lib/db/schema";
import { articleDedupKey } from "@/lib/ingest/helpers";
import {
  fetchNewsLive,
  type NewsFetchResult,
} from "@/lib/news/fetch-news";
import { extractTickers } from "@/lib/news/sources/shared";
import { inferFinanceCategory } from "@/lib/news/sources/finance";
import { decodeHtmlEntities } from "@/lib/news/text";
import type {
  FeedMarket,
  MarketFilter,
  NewsItem,
  NewsScope,
} from "@/lib/types";

export type MacroEvent = {
  id: string;
  title: string;
  country: string;
  impact: string;
  eventAt: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  sector: string | null;
  eventType: string | null;
  sourceUrl: string | null;
};

function rowToNewsItem(
  row: {
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
  },
  sourceName: string,
): NewsItem {
  const title = decodeHtmlEntities(row.title);
  const summary = decodeHtmlEntities(row.summary);
  // Re-extract on read so stale false positives (Ada → ADA) disappear
  // without waiting for a full re-ingest.
  const tickers =
    row.scope === "finance"
      ? extractTickers(`${title} ${summary}`)
      : (row.tickers ?? []);
  const category =
    row.scope === "finance"
      ? inferFinanceCategory(title, summary, row.category)
      : row.category;

  return {
    id: row.id,
    title,
    summary,
    url: row.url,
    source: sourceName,
    publishedAt: row.publishedAt.toISOString(),
    category,
    tickers,
    scope: row.scope as "finance" | "general",
    language: (row.language as "en" | "id" | undefined) ?? undefined,
    market: (row.market as FeedMarket | undefined) ?? undefined,
  };
}

function marketSqlCondition(market: MarketFilter) {
  if (market === "all") return undefined;
  if (market === "world") {
    return or(
      eq(articles.market, "global"),
      eq(articles.market, "US"),
      eq(articles.market, "EU"),
      eq(articles.market, "Asia"),
      eq(sources.market, "global"),
      eq(sources.market, "US"),
      eq(sources.market, "EU"),
      eq(sources.market, "Asia"),
    );
  }
  if (market === "ID") {
    return or(eq(articles.market, "ID"), eq(sources.market, "ID"));
  }
  if (market === "US") {
    return or(eq(articles.market, "US"), eq(sources.market, "US"));
  }
  if (market === "EU") {
    return or(eq(articles.market, "EU"), eq(sources.market, "EU"));
  }
  if (market === "Asia") {
    return or(eq(articles.market, "Asia"), eq(sources.market, "Asia"));
  }
  return undefined;
}

async function queryNewsFromDb(options?: {
  scope?: NewsScope;
  category?: string;
  q?: string;
  symbol?: string;
  market?: MarketFilter;
}): Promise<NewsFetchResult> {
  const scope = options?.scope ?? "finance";
  const db = getDb();
  const category = options?.category ?? "all";
  const market =
    options?.market ?? (scope === "general" ? "world" : "all");

  const conditions = [];
  if (scope === "finance") {
    conditions.push(eq(articles.scope, "finance"));
  } else if (scope === "general") {
    conditions.push(eq(articles.scope, "general"));
  }

  if (category !== "all") {
    conditions.push(eq(articles.category, category));
  }

  if (scope !== "trending") {
    const m = marketSqlCondition(market);
    if (m) conditions.push(m);
  }

  const q = options?.q?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        sql`to_tsvector('simple', coalesce(${articles.title}, '') || ' ' || coalesce(${articles.summary}, '')) @@ plainto_tsquery('simple', ${q})`,
        ilike(articles.title, pattern),
        ilike(articles.summary, pattern),
        sql`exists (select 1 from unnest(${articles.tickers}) t where t ilike ${pattern})`,
        ilike(sources.name, pattern),
      ),
    );
  }

  const symbol = options?.symbol?.trim().toUpperCase();
  const normalized = symbol
    ? symbol === "VIX"
      ? "^VIX"
      : symbol
    : null;

  const limit = scope === "trending" ? 200 : 120;

  // Select only columns the UI needs (egress-friendly).
  const selectShape = {
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
    sourceName: sources.name,
    sourceMarket: sources.market,
  };

  let rows;
  if (normalized) {
    rows = await db
      .select(selectShape)
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .innerJoin(
        articleInstruments,
        eq(articleInstruments.articleId, articles.id),
      )
      .where(
        and(
          ...(conditions.length ? conditions : []),
          eq(articleInstruments.symbol, normalized),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  } else {
    rows = await db
      .select(selectShape)
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
  }

  let items = rows.map((r) =>
    rowToNewsItem(
      {
        id: r.id,
        title: r.title,
        summary: r.summary,
        url: r.url,
        publishedAt: r.publishedAt,
        category: r.category,
        tickers: r.tickers,
        scope: r.scope,
        language: r.language,
        market: r.market ?? r.sourceMarket,
      },
      r.sourceName,
    ),
  );

  const deduped = new Map<string, NewsItem>();
  for (const item of items) {
    const key = articleDedupKey(item.url, item.title);
    if (!deduped.has(key)) deduped.set(key, item);
  }
  items = Array.from(deduped.values());

  if (scope === "trending") {
    const worldItems = items.filter((i) => i.market !== "ID");
    const idItems = items.filter((i) => i.market === "ID");
    items = [...worldItems.slice(0, 60), ...idItems.slice(0, 60)].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }

  // Fallback: if symbol join returned nothing (links not yet populated),
  // try a lighter text filter on the already-fetched finance pool.
  if (normalized && items.length === 0 && !options?.q) {
    const needle = normalized.replace("-USD", "").replace("^", "");
    const fallback = await db
      .select(selectShape)
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(
        and(
          ...(conditions.length ? conditions : []),
          or(
            sql`${needle} = any(${articles.tickers})`,
            ilike(articles.title, `%${needle}%`),
            ilike(articles.summary, `%${needle}%`),
          ),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);
    items = fallback.map((r) =>
      rowToNewsItem(
        {
          id: r.id,
          title: r.title,
          summary: r.summary,
          url: r.url,
          publishedAt: r.publishedAt,
          category: r.category,
          tickers: r.tickers,
          scope: r.scope,
          language: r.language,
          market: r.market ?? r.sourceMarket,
        },
        r.sourceName,
      ),
    );
  }

  const sliced =
    scope === "trending" ? items.slice(0, 120) : items.slice(0, 80);
  const shownSources = Array.from(new Set(sliced.map((i) => i.source)));

  return {
    items: sliced,
    liveSources: shownSources,
    failedSources: [],
    fetchedAt: new Date().toISOString(),
    scope,
    fromStore: true,
    emptyStore: sliced.length === 0,
  };
}

/**
 * Prefer Postgres when DATABASE_URL is set; otherwise live RSS fan-out.
 */
export async function fetchNews(options?: {
  scope?: NewsScope;
  category?: string;
  q?: string;
  symbol?: string;
  market?: MarketFilter;
}): Promise<NewsFetchResult> {
  if (hasDatabase()) {
    try {
      return await queryNewsFromDb(options);
    } catch (err) {
      console.error("queryNewsFromDb failed, falling back to live RSS", err);
      return fetchNewsLive(options);
    }
  }
  return fetchNewsLive(options);
}

export async function queryMacroEvents(options?: {
  hoursAhead?: number;
  minImpact?: "high" | "medium" | "low";
  limit?: number;
}): Promise<MacroEvent[]> {
  if (!hasDatabase()) return [];
  try {
    const db = getDb();
    const hoursAhead = options?.hoursAhead ?? 48;
    const limit = options?.limit ?? 12;
    const now = new Date();
    const until = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    const min = options?.minImpact ?? "medium";
    const impactFilter =
      min === "high"
        ? eq(macroEvents.impact, "high")
        : min === "low"
          ? undefined
          : or(
              eq(macroEvents.impact, "high"),
              eq(macroEvents.impact, "medium"),
            );

    const rows = await db
      .select({
        id: macroEvents.id,
        title: macroEvents.title,
        country: macroEvents.country,
        impact: macroEvents.impact,
        eventAt: macroEvents.eventAt,
        actual: macroEvents.actual,
        forecast: macroEvents.forecast,
        previous: macroEvents.previous,
        sector: macroEvents.sector,
        eventType: macroEvents.eventType,
        sourceUrl: macroEvents.sourceUrl,
      })
      .from(macroEvents)
      .where(
        and(
          gte(macroEvents.eventAt, now),
          sql`${macroEvents.eventAt} <= ${until}`,
          impactFilter,
        ),
      )
      .orderBy(asc(macroEvents.eventAt))
      .limit(limit);

    return rows.map(mapMacro);
  } catch (err) {
    console.error("queryMacroEvents failed", err);
    return [];
  }
}

function mapMacro(r: {
  id: string;
  title: string;
  country: string;
  impact: string;
  eventAt: Date;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  sector?: string | null;
  eventType?: string | null;
  sourceUrl?: string | null;
}): MacroEvent {
  return {
    id: r.id,
    title: r.title,
    country: r.country,
    impact: r.impact,
    eventAt: r.eventAt.toISOString(),
    actual: r.actual,
    forecast: r.forecast,
    previous: r.previous,
    sector: r.sector ?? null,
    eventType: r.eventType ?? null,
    sourceUrl: r.sourceUrl ?? null,
  };
}

/** Keep type export for callers that imported MacroEventRow via query path. */
export type { MacroEventRow };
