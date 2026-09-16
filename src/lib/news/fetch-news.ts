import Parser from "rss-parser";
import type {
  FeedMarket,
  MarketFilter,
  NewsItem,
  NewsScope,
} from "@/lib/types";
import { articleDedupKey, normalizeArticleUrl } from "@/lib/ingest/helpers";
import { FINANCE_SOURCES, inferFinanceCategory } from "@/lib/news/sources/finance";
import {
  GENERAL_SOURCES,
  inferGeneralCategory,
} from "@/lib/news/sources/general";
import { extractTickers, slugId } from "@/lib/news/sources/shared";
import { stripHtml } from "@/lib/news/text";
import type { FeedSource } from "@/lib/news/sources/finance";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "FinPulse/0.4 (+https://localhost; research aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

export type NewsFetchResult = {
  items: NewsItem[];
  liveSources: string[];
  failedSources: string[];
  fetchedAt: string;
  scope: NewsScope;
  /** True when rows came from Postgres ingest store */
  fromStore?: boolean;
  /** Store connected but no rows yet */
  emptyStore?: boolean;
};

/** Whether a feed market matches the UI filter. */
export function feedMatchesMarket(
  feedMarket: FeedMarket | undefined,
  filter: MarketFilter,
): boolean {
  if (filter === "all") return true;
  const m = feedMarket ?? "global";
  if (filter === "world") return m === "global" || m === "US" || m === "EU" || m === "Asia";
  if (filter === "ID") return m === "ID";
  if (filter === "US") return m === "US";
  if (filter === "EU") return m === "EU";
  if (filter === "Asia") return m === "Asia";
  return true;
}

async function fetchFeed(
  source: FeedSource,
  scope: "finance" | "general",
): Promise<NewsItem[]> {
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
        ? new Date(item.isoDate).toISOString()
        : item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString();
      const category =
        scope === "finance"
          ? inferFinanceCategory(title, summary, source.category)
          : inferGeneralCategory(title, summary, source.category);
      return {
        id: slugId(source.id, title, urlLink),
        title,
        summary: summary || "Open the article for full context.",
        url: urlLink,
        source: source.name,
        publishedAt,
        category,
        tickers: scope === "finance" ? extractTickers(`${title} ${summary}`) : [],
        scope,
        language: source.language,
        market: source.market ?? (source.language === "id" ? "ID" : "global"),
      } satisfies NewsItem;
    });
}

function sourcesForScope(scope: NewsScope): FeedSource[] {
  if (scope === "general" || scope === "trending") {
    if (scope === "trending") return [...GENERAL_SOURCES, ...FINANCE_SOURCES];
    return GENERAL_SOURCES;
  }
  return FINANCE_SOURCES;
}

/** Live RSS fan-out — used when DATABASE_URL is unset or DB query fails. */
export async function fetchNewsLive(options?: {
  scope?: NewsScope;
  category?: string;
  q?: string;
  symbol?: string;
  market?: MarketFilter;
}): Promise<NewsFetchResult> {
  const scope = options?.scope ?? "finance";
  const sources = sourcesForScope(scope);
  const itemScope: "finance" | "general" =
    scope === "finance" ? "finance" : "general";

  const financeIds = new Set(FINANCE_SOURCES.map((s) => s.id));
  const settled = await Promise.allSettled(
    sources.map((s) =>
      fetchFeed(
        s,
        scope === "trending"
          ? financeIds.has(s.id)
            ? "finance"
            : "general"
          : itemScope,
      ),
    ),
  );

  const liveSources: string[] = [];
  const failedSources: string[] = [];
  const liveItems: NewsItem[] = [];

  settled.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      // Empty feed is success (reachable), not a failure.
      liveSources.push(sources[idx].name);
      liveItems.push(...result.value);
    } else {
      failedSources.push(sources[idx].name);
    }
  });

  const deduped = new Map<string, NewsItem>();
  for (const item of liveItems) {
    const key = articleDedupKey(item.url, item.title);
    if (!deduped.has(key)) deduped.set(key, item);
  }

  let items = Array.from(deduped.values()).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  if (scope === "trending") {
    const worldItems = items.filter((i) => i.market !== "ID");
    const idItems = items.filter((i) => i.market === "ID");
    items = [...worldItems.slice(0, 60), ...idItems.slice(0, 60)].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }

  const category = options?.category ?? "all";
  if (category !== "all") {
    items = items.filter((i) => i.category === category);
  }

  const market =
    options?.market ?? (scope === "general" ? "world" : "all");
  if (scope !== "trending" && market !== "all") {
    items = items.filter((i) => feedMatchesMarket(i.market, market));
  }

  const q = options?.q?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q) ||
        i.tickers.some((t) => t.toLowerCase().includes(q)) ||
        i.source.toLowerCase().includes(q),
    );
  }

  const symbol = options?.symbol?.trim().toUpperCase();
  if (symbol) {
    const normalized = symbol === "VIX" ? "^VIX" : symbol;
    items = items.filter(
      (i) =>
        i.tickers.some((t) => t.toUpperCase() === normalized) ||
        i.title
          .toUpperCase()
          .includes(normalized.replace("-USD", "").replace("^", "")) ||
        i.summary
          .toUpperCase()
          .includes(normalized.replace("-USD", "").replace("^", "")),
    );
  }

  const sliced =
    scope === "trending" ? items.slice(0, 120) : items.slice(0, 80);
  const shownSources = Array.from(new Set(sliced.map((i) => i.source)));
  const relevantFailed =
    market === "all" || scope === "trending"
      ? failedSources
      : failedSources.filter((name) => {
          const src = sources.find((s) => s.name === name);
          return src ? feedMatchesMarket(src.market, market) : true;
        });

  return {
    items: sliced,
    liveSources: shownSources,
    failedSources: Array.from(new Set(relevantFailed)),
    fetchedAt: new Date().toISOString(),
    scope,
    fromStore: false,
  };
}

/** @deprecated use fetchNews from @/lib/news/query-news */
export const fetchFinancialNews = fetchNewsLive;
