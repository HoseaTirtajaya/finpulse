import { NextRequest, NextResponse } from "next/server";
import { getCachedNews } from "@/lib/cache";
import { buildTrendSignals } from "@/lib/trends";
import { buildTrendClusters } from "@/lib/news/trending";
import type { MarketFilter, NewsScope } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const scope = (searchParams.get("scope") || "finance") as NewsScope;
  const category = searchParams.get("category") || "all";
  const q = searchParams.get("q") || undefined;
  const symbol = searchParams.get("symbol") || undefined;
  const market = (searchParams.get("market") || "all") as MarketFilter;

  try {
    const result = await getCachedNews({
      scope,
      category,
      q,
      symbol,
      market,
    });
    const trends =
      scope === "finance" ? buildTrendSignals(result.items) : [];
    const clusters =
      scope === "trending" ? buildTrendClusters(result.items) : [];
    return NextResponse.json({ ...result, trends, clusters });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}
