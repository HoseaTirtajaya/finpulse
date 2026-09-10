import { NextRequest, NextResponse } from "next/server";
import { INSTRUMENTS } from "@/lib/instruments";
import { getCachedNews, getCachedQuotes } from "@/lib/cache";
import { rankRecommendations } from "@/lib/recommend/rank";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("symbols");
  const symbols = raw
    ? raw
        .split(",")
        .map((s) => decodeURIComponent(s.trim()))
        .filter(Boolean)
    : INSTRUMENTS.map((i) => i.symbol);
  const scope = raw ? "watchlist" : "universe";

  try {
    const [news, quotes] = await Promise.all([
      getCachedNews({ scope: "finance", category: "all" }),
      getCachedQuotes(symbols.join(",")),
    ]);
    const bundle = await rankRecommendations({
      symbols,
      news: news.items,
      quotes,
      scope,
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
