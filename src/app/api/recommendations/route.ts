import { NextRequest, NextResponse } from "next/server";
import { INSTRUMENTS } from "@/lib/instruments";
import {
  getCachedMacroEvents,
  getCachedNews,
  getCachedQuotes,
} from "@/lib/cache";
import {
  mergeNewsPools,
  rankRecommendations,
} from "@/lib/recommend/rank";
import type { RecMarketSegment } from "@/lib/types";


export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("symbols");
  const marketParam = (request.nextUrl.searchParams.get("market") ||
    "all") as RecMarketSegment;
  const market: RecMarketSegment = [
    "all",
    "US",
    "EU",
    "ID",
    "Asia",
    "global",
    "crypto",
  ].includes(marketParam)
    ? marketParam
    : "all";

  const symbols = raw
    ? raw
        .split(",")
        .map((s) => decodeURIComponent(s.trim()))
        .filter(Boolean)
    : INSTRUMENTS.filter((i) => {
        if (market === "all") return true;
        if (market === "crypto") return i.type === "crypto";
        return i.market === market;
      }).map((i) => i.symbol);

  // Watchlist may have no names in this segment (e.g. equities + market=crypto).
  // Fall back to the full segment universe so the tab is never blank.
  let resolved = symbols;
  let scope: "watchlist" | "universe" = raw ? "watchlist" : "universe";
  if (market === "crypto") {
    const cryptoOnly = resolved
      .map((s) => INSTRUMENTS.find((i) => i.symbol === s || i.symbol.toUpperCase() === s.toUpperCase()))
      .filter((i): i is (typeof INSTRUMENTS)[number] => Boolean(i && i.type === "crypto"))
      .map((i) => i.symbol);
    if (cryptoOnly.length === 0) {
      resolved = INSTRUMENTS.filter((i) => i.type === "crypto").map((i) => i.symbol);
      scope = "universe";
    } else {
      resolved = cryptoOnly;
    }
  }

  try {
    const [finance, general, trending, quotes, macroEvents] =
      await Promise.all([
        getCachedNews({ scope: "finance", category: "all" }),
        getCachedNews({ scope: "general", category: "all", market: "all" }),
        getCachedNews({ scope: "trending" }),
        getCachedQuotes(resolved.join(",")),
        getCachedMacroEvents(),
      ]);

    const news = mergeNewsPools([
      finance.items,
      general.items,
      trending.items,
    ]);

    const bundle = await rankRecommendations({
      symbols: resolved,
      news,
      quotes,
      scope,
      market,
      macroEvents,
    });
    return NextResponse.json(bundle);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to build recommendations" },
      { status: 500 },
    );
  }
}
