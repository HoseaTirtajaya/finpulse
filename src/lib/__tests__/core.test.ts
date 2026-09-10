import { describe, expect, it } from "vitest";
import { extractTickers, jaccard, significantTokens } from "@/lib/news/sources/shared";
import { buildTrendClusters } from "@/lib/news/trending";
import { countTone, toneScoreFromItems } from "@/lib/sentiment";
import { inferFinanceCategory } from "@/lib/news/sources/finance";
import type { NewsItem } from "@/lib/types";

describe("extractTickers", () => {
  it("finds US and IDX tickers plus aliases", () => {
    const t = extractTickers("Nvidia and Bank Central Asia lead while IHSG rises");
    expect(t).toContain("NVDA");
    expect(t).toContain("BBCA");
    expect(t).toContain("^JKSE");
  });
});

describe("sentiment", () => {
  it("scores English constructive tone", () => {
    const { positive, negative } = countTone("Markets rally on strong growth hope", "en");
    expect(positive).toBeGreaterThan(negative);
  });

  it("scores Bahasa constructive tone", () => {
    const { positive, negative } = countTone("Saham BCA menguat setelah laba melonjak", "id");
    expect(positive).toBeGreaterThan(negative);
  });

  it("aggregates toneScoreFromItems", () => {
    const score = toneScoreFromItems([
      { title: "Stocks surge", summary: "strong bid", language: "en" },
      { title: "Saham naik", summary: "menguat", language: "id" },
    ]);
    expect(score).toBeGreaterThan(0);
  });
});

describe("inferFinanceCategory", () => {
  it("detects crypto and macro", () => {
    expect(inferFinanceCategory("Bitcoin ETF flows", "", "markets")).toBe("crypto");
    expect(inferFinanceCategory("Fed rate cut bets", "inflation cools", "markets")).toBe(
      "macro",
    );
  });
});

describe("trending clusters", () => {
  it("clusters similar titles across sources", () => {
    const items: NewsItem[] = [
      {
        id: "1",
        title: "Central bank holds rates amid inflation concerns",
        summary: "",
        url: "https://a.example/1",
        source: "A",
        publishedAt: new Date().toISOString(),
        category: "macro",
        tickers: [],
        scope: "finance",
      },
      {
        id: "2",
        title: "Central bank holds interest rates amid inflation worries",
        summary: "",
        url: "https://b.example/2",
        source: "B",
        publishedAt: new Date().toISOString(),
        category: "macro",
        tickers: [],
        scope: "finance",
      },
      {
        id: "3",
        title: "Football club wins championship final",
        summary: "",
        url: "https://c.example/3",
        source: "C",
        publishedAt: new Date().toISOString(),
        category: "sports",
        tickers: [],
        scope: "general",
      },
    ];
    const clusters = buildTrendClusters(items);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    const top = clusters.find((c) => c.sourceCount >= 2);
    expect(top).toBeTruthy();
  });

  it("jaccard rewards overlap", () => {
    const a = significantTokens("central bank holds rates inflation");
    const b = significantTokens("central bank holds interest rates inflation");
    expect(jaccard(a, b)).toBeGreaterThan(0.3);
  });
});
