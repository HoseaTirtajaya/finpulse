import Parser from "rss-parser";
import type { NewsCategory, NewsItem } from "@/lib/types";
import {
  extractTickers,
  FALLBACK_NEWS,
  FEED_SOURCES,
  inferCategory,
  slugId,
} from "@/lib/news/sources";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "FinPulse/0.1 (+https://localhost; research aggregator)",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

export type NewsFetchResult = {
  items: NewsItem[];
  liveSources: string[];
  usedFallback: boolean;
  fetchedAt: string;
};

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFeed(
  sourceId: string,
  name: string,
  url: string,
  category: Exclude<NewsCategory, "all">,
): Promise<NewsItem[]> {
  const feed = await parser.parseURL(url);
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
      return {
        id: slugId(sourceId, title, urlLink),
        title,
        summary: summary || "Open the article for full context.",
        url: urlLink,
        source: name,
        publishedAt,
        category: inferCategory(title, summary, category),
        tickers: extractTickers(`${title} ${summary}`),
      } satisfies NewsItem;
    });
}

export async function fetchFinancialNews(options?: {
  category?: NewsCategory;
  q?: string;
  symbol?: string;
}): Promise<NewsFetchResult> {
  const settled = await Promise.allSettled(
    FEED_SOURCES.map((s) => fetchFeed(s.id, s.name, s.url, s.category)),
  );

  const liveSources: string[] = [];
  const liveItems: NewsItem[] = [];

  settled.forEach((result, idx) => {
    if (result.status === "fulfilled" && result.value.length > 0) {
      liveSources.push(FEED_SOURCES[idx].name);
      liveItems.push(...result.value);
    }
  });

  // Always blend the tagged desk corpus so watchlist/recommendation
  // matching still has instrument-aware headlines when live RSS omits tickers.
  const usedFallback = liveItems.length < 4;
  const base = [...liveItems, ...FALLBACK_NEWS];

  const deduped = new Map<string, NewsItem>();
  for (const item of base) {
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
        i.title.toUpperCase().includes(normalized.replace("-USD", "")) ||
        i.summary.toUpperCase().includes(normalized.replace("-USD", "")),
    );
  }

  return {
    items: items.slice(0, 60),
    liveSources,
    usedFallback,
    fetchedAt: new Date().toISOString(),
  };
}
