import Parser from "rss-parser";
import type {
  MarketFilter,
  NewsItem,
  NewsScope,
} from "@/lib/types";
import { FINANCE_SOURCES, inferFinanceCategory } from "@/lib/news/sources/finance";
import {
  GENERAL_SOURCES,
  inferGeneralCategory,
} from "@/lib/news/sources/general";
import { extractTickers, slugId } from "@/lib/news/sources/shared";
import type { FeedSource } from "@/lib/news/sources/finance";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "FinPulse/0.3 (+https://localhost; research aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

export type NewsFetchResult = {
  items: NewsItem[];
  liveSources: string[];
  failedSources: string[];
  fetchedAt: string;
  scope: NewsScope;
};

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
      const urlLink = item.link || item.guid || "#";
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
      } satisfies NewsItem;
    });
}

function sourcesForScope(scope: NewsScope): FeedSource[] {
  if (scope === "general" || scope === "trending") {
    // Trending clusters across general (+ finance) for broader velocity.
    if (scope === "trending") return [...GENERAL_SOURCES, ...FINANCE_SOURCES];
    return GENERAL_SOURCES;
  }
  return FINANCE_SOURCES;
}

export async function fetchNews(options?: {
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
    if (result.status === "fulfilled" && result.value.length > 0) {
      liveSources.push(sources[idx].name);
      liveItems.push(...result.value);
    } else {
      failedSources.push(sources[idx].name);
    }
  });

  const deduped = new Map<string, NewsItem>();
  for (const item of liveItems) {
    const key = item.title.toLowerCase().slice(0, 80);
    if (!deduped.has(key)) deduped.set(key, item);
  }

  let items = Array.from(deduped.values()).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const category = options?.category ?? "all";
  if (category !== "all") {
    items = items.filter((i) => i.category === category);
  }

  const market = options?.market ?? "all";
  if (scope === "finance" && market !== "all") {
    const allowed = new Set(
      sources
        .filter((s) => s.market === market || s.market === "global")
        .map((s) => s.name),
    );
    items = items.filter((i) => allowed.has(i.source));
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
        i.title.toUpperCase().includes(normalized.replace("-USD", "").replace("^", "")) ||
        i.summary
          .toUpperCase()
          .includes(normalized.replace("-USD", "").replace("^", "")),
    );
  }

  return {
    items: items.slice(0, 80),
    liveSources: Array.from(new Set(liveSources)),
    failedSources: Array.from(new Set(failedSources)),
    fetchedAt: new Date().toISOString(),
    scope,
  };
}

/** @deprecated use fetchNews — kept for gradual call-site migration */
export const fetchFinancialNews = fetchNews;
