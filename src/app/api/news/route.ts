import { NextRequest, NextResponse } from "next/server";
import { fetchFinancialNews } from "@/lib/news/fetch-news";
import { buildTrendSignals } from "@/lib/trends";
import type { NewsCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = (searchParams.get("category") || "all") as NewsCategory;
  const q = searchParams.get("q") || undefined;
  const symbol = searchParams.get("symbol") || undefined;

  try {
    const result = await fetchFinancialNews({ category, q, symbol });
    const trends = buildTrendSignals(result.items);
    return NextResponse.json({ ...result, trends });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}
