import { describe, expect, it } from "vitest";
import { extractTickers, jaccard, significantTokens } from "@/lib/news/sources/shared";
import { buildTrendClusters } from "@/lib/news/trending";
import { feedMatchesMarket } from "@/lib/news/fetch-news";
import { countTone, toneScoreFromItems } from "@/lib/sentiment";
import { inferFinanceCategory } from "@/lib/news/sources/finance";
import type { NewsItem } from "@/lib/types";

function item(
  partial: Partial<NewsItem> & Pick<NewsItem, "id" | "title" | "source">,
): NewsItem {
  return {
    summary: "",
    url: `https://example.com/${partial.id}`,
    publishedAt: new Date().toISOString(),
    category: "world",
    tickers: [],
    scope: "general",
    language: "en",
    market: "global",
    ...partial,
  };
}

describe("extractTickers", () => {
  it("finds US and IDX tickers plus aliases", () => {
    const t = extractTickers("Nvidia and Bank Central Asia lead while IHSG rises");
    expect(t).toContain("NVDA");
    expect(t).toContain("BBCA");
    expect(t).toContain("^JKSE");
  });

  it("does not tag BBRI from BRICS substring", () => {
    const t = extractTickers(
      "Presiden Putin tiba di New Delhi untuk KTT BRICS",
    );
    expect(t).not.toContain("BBRI");
  });

  it("tags BBRI from BRI / Bank Rakyat", () => {
    expect(extractTickers("Saham BRI menguat setelah laba naik")).toContain(
      "BBRI",
    );
    expect(
      extractTickers("Bank Rakyat Indonesia reports strong NPL"),
    ).toContain("BBRI");
  });

  it("tags major crypto without false positives", () => {
    expect(extractTickers("Ethereum ETF inflows hit a record")).toContain(
      "ETH-USD",
    );
    expect(extractTickers("Solana validators restart after outage")).toContain(
      "SOL-USD",
    );
    expect(extractTickers("Optimism Superchain activity rises")).toContain(
      "OP-USD",
    );
    // "solution" must not match SOL as a bare substring
    expect(extractTickers("A lasting solution for markets")).not.toContain(
      "SOL-USD",
    );
  });
});

describe("coingecko mapper", () => {
  it("maps markets payload to CryptoMarketRow", async () => {
    const { mapCgMarket } = await import("@/lib/market/coingecko");
    const row = mapCgMarket({
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      image: "https://example.com/btc.png",
      current_price: 100000,
      market_cap: 2e12,
      market_cap_rank: 1,
      total_volume: 5e10,
      price_change_percentage_24h: 2.5,
      sparkline_in_7d: { price: [1, 2, 3] },
      last_updated: "2026-01-01T00:00:00.000Z",
    });
    expect(row.instrumentSymbol).toBe("BTC-USD");
    expect(row.rank).toBe(1);
    expect(row.symbol).toBe("BTC");
    expect(row.changePct24h).toBe(2.5);
    expect(row.sparkline7d).toEqual([1, 2, 3]);
  });
});

describe("inferFinanceCategory", () => {
  it("detects crypto and macro", () => {
    expect(inferFinanceCategory("Bitcoin ETF flows", "", "markets")).toBe("crypto");
    expect(inferFinanceCategory("Solana TVL climbs", "", "markets")).toBe(
      "crypto",
    );
    expect(inferFinanceCategory("Fed rate cut bets", "inflation cools", "markets")).toBe(
      "macro",
    );
  });
});

describe("matchesInstrument", () => {
  it("rejects generic Indonesia / Bank headlines for BBRI", async () => {
    const { matchesInstrument } = await import("@/lib/news/match-instrument");
    const stale = item({
      id: "stale",
      title: "Indonesia banks see deposit growth",
      source: "X",
      tickers: ["BBRI"],
      scope: "finance",
    });
    expect(
      matchesInstrument(
        stale,
        "BBRI",
        "Bank Rakyat Indonesia",
        ["BRI", "Bank Rakyat"],
      ),
    ).toBe(false);

    const brics = item({
      id: "brics",
      title: "Presiden Putin tiba di New Delhi untuk KTT BRICS",
      source: "X",
      tickers: ["BBRI"],
      scope: "finance",
    });
    expect(
      matchesInstrument(brics, "BBRI", "Bank Rakyat Indonesia", ["BRI"]),
    ).toBe(false);
  });

  it("accepts real BRI headlines", async () => {
    const { matchesInstrument } = await import("@/lib/news/match-instrument");
    const ok = item({
      id: "ok",
      title: "Saham BRI menguat setelah laba naik",
      source: "X",
      tickers: [],
      scope: "finance",
    });
    expect(
      matchesInstrument(ok, "BBRI", "Bank Rakyat Indonesia", ["BRI"]),
    ).toBe(true);
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

describe("fx convert", () => {
  it("converts IDR to USD and back with priority book", async () => {
    const { convertCurrency, crossRate, buildIdrConversionBoard } =
      await import("@/lib/fx/convert");
    const rates = {
      USDIDR: 16000,
      EURUSD: 1.1,
      GBPUSD: 1.25,
      AUDUSD: 0.65,
      USDSGD: 1.35,
      USDJPY: 150,
      USDCHF: 0.9,
      USDHKD: 7.8,
      asOf: null,
    };
    expect(convertCurrency(16_000_000, "IDR", "USD", rates)).toBeCloseTo(
      1000,
      5,
    );
    expect(convertCurrency(1000, "USD", "IDR", rates)).toBeCloseTo(
      16_000_000,
      5,
    );
    expect(crossRate("USD", "IDR", rates)).toBe(16000);
    expect(convertCurrency(110, "EUR", "USD", rates)).toBeCloseTo(121, 5);
    expect(convertCurrency(100, "GBP", "USD", rates)).toBeCloseTo(125, 5);
    expect(convertCurrency(135, "SGD", "USD", rates)).toBeCloseTo(100, 5);

    const board = buildIdrConversionBoard(16_000_000, rates);
    const usdRow = board.find((r) => r.currency === "USD");
    expect(usdRow?.converted).toBeCloseTo(1000, 5);
    expect(usdRow?.idrPerUnit).toBe(16000);
    expect(board.some((r) => r.currency === "GBP")).toBe(true);
    expect(board.some((r) => r.currency === "SGD")).toBe(true);
  });
});

describe("feedMatchesMarket", () => {
  it("world filter keeps global and US, drops ID", () => {
    expect(feedMatchesMarket("global", "world")).toBe(true);
    expect(feedMatchesMarket("US", "world")).toBe(true);
    expect(feedMatchesMarket("ID", "world")).toBe(false);
  });

  it("ID filter keeps only Indonesia", () => {
    expect(feedMatchesMarket("ID", "ID")).toBe(true);
    expect(feedMatchesMarket("US", "ID")).toBe(false);
    expect(feedMatchesMarket("global", "ID")).toBe(false);
  });

  it("all passes everything", () => {
    expect(feedMatchesMarket("ID", "all")).toBe(true);
    expect(feedMatchesMarket("US", "all")).toBe(true);
  });
});

describe("trending clusters", () => {
  it("clusters similar titles across sources in world lane", () => {
    const items: NewsItem[] = [
      item({
        id: "1",
        title: "Central bank holds rates amid inflation concerns",
        source: "A",
        scope: "finance",
        category: "macro",
        market: "US",
      }),
      item({
        id: "2",
        title: "Central bank holds interest rates amid inflation worries",
        source: "B",
        scope: "finance",
        category: "macro",
        market: "US",
      }),
      item({
        id: "3",
        title: "Football club wins championship final",
        source: "C",
        category: "sports",
        market: "global",
      }),
    ];
    const lanes = buildTrendClusters(items, Date.now());
    expect(lanes.world.some((c) => c.sourceCount >= 2)).toBe(true);
    // Single-outlet football story must not trend
    expect(
      lanes.world.every((c) => !c.title.toLowerCase().includes("football")),
    ).toBe(true);
    expect(lanes.indonesia).toHaveLength(0);
  });

  it("drops single-outlet clusters", () => {
    const lanes = buildTrendClusters(
      [
        item({
          id: "solo",
          title: "Unique headline about obscure volcano eruption today",
          source: "Solo Desk",
          market: "global",
        }),
      ],
      Date.now(),
    );
    expect(lanes.world).toHaveLength(0);
    expect(lanes.indonesia).toHaveLength(0);
  });

  it("keeps EN and ID in disjoint lanes", () => {
    const items: NewsItem[] = [
      item({
        id: "en1",
        title: "Election results reshape parliament majority",
        source: "BBC",
        market: "global",
        language: "en",
      }),
      item({
        id: "en2",
        title: "Election results reshape the parliament majority",
        source: "Guardian",
        market: "global",
        language: "en",
      }),
      item({
        id: "id1",
        title: "Hasil pemilu mengubah komposisi parlemen nasional",
        source: "Detik",
        market: "ID",
        language: "id",
      }),
      item({
        id: "id2",
        title: "Hasil pemilu mengubah komposisi parlemen nasional lagi",
        source: "Antara",
        market: "ID",
        language: "id",
      }),
    ];
    const lanes = buildTrendClusters(items, Date.now());
    expect(lanes.world.length).toBeGreaterThanOrEqual(1);
    expect(lanes.indonesia.length).toBeGreaterThanOrEqual(1);
    const worldSources = lanes.world.flatMap((c) => c.sources);
    const idSources = lanes.indonesia.flatMap((c) => c.sources);
    expect(worldSources.some((s) => s === "Detik" || s === "Antara")).toBe(
      false,
    );
    expect(idSources.some((s) => s === "BBC" || s === "Guardian")).toBe(false);
  });

  it("jaccard rewards overlap", () => {
    const a = significantTokens("central bank holds rates inflation");
    const b = significantTokens("central bank holds interest rates inflation");
    expect(jaccard(a, b)).toBeGreaterThan(0.3);
  });
});

describe("recommendation dynamics", () => {
  it("merges news pools without duplicate ids", async () => {
    const { mergeNewsPools } = await import("@/lib/recommend/rank");
    const merged = mergeNewsPools([
      [
        {
          id: "1",
          title: "A",
          summary: "",
          url: "u1",
          source: "S",
          publishedAt: new Date().toISOString(),
          category: "markets",
          tickers: [],
          scope: "finance",
        },
      ],
      [
        {
          id: "1",
          title: "A dup",
          summary: "",
          url: "u1",
          source: "S",
          publishedAt: new Date().toISOString(),
          category: "world",
          tickers: [],
          scope: "general",
        },
        {
          id: "2",
          title: "B",
          summary: "",
          url: "u2",
          source: "T",
          publishedAt: new Date().toISOString(),
          category: "world",
          tickers: [],
          scope: "general",
        },
      ],
    ]);
    expect(merged).toHaveLength(2);
  });

  it("boosts US names for high-impact USD macro", async () => {
    const { macroBoostForMarket } = await import("@/lib/recommend/rank");
    const { boost } = macroBoostForMarket("US", [
      {
        id: "1",
        title: "CPI m/m",
        country: "USD",
        impact: "high",
        eventAt: new Date().toISOString(),
        actual: null,
        forecast: null,
        previous: null,
      },
    ]);
    expect(boost).toBe(6);
    const asia = macroBoostForMarket("Asia", [
      {
        id: "2",
        title: "BOJ Rate Decision",
        country: "JPY",
        impact: "high",
        eventAt: new Date().toISOString(),
        actual: null,
        forecast: null,
        previous: null,
      },
    ]);
    expect(asia.boost).toBe(6);
  });
});
