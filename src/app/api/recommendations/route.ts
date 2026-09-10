import { NextRequest, NextResponse } from "next/server";
import { INSTRUMENTS } from "@/lib/instruments";
import { fetchFinancialNews } from "@/lib/news/fetch-news";
import { fetchQuotes } from "@/lib/quotes/fetch-quotes";
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
      fetchFinancialNews({ category: "all" }),
      fetchQuotes(symbols),
    ]);
    const bundle = rankRecommendations({
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
