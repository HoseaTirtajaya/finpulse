import { NextRequest, NextResponse } from "next/server";
import { generateBrief } from "@/lib/ai/analyze";
import { fetchFinancialNews } from "@/lib/news/fetch-news";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      symbol?: string;
      category?: string;
    };
    const symbol = body.symbol?.trim();
    const category = (body.category as "all") || "all";

    let news = await fetchFinancialNews({ symbol, category });
    // If a symbol filter returns nothing, fall back to the broad tape so the
    // brief still has headline material to summarize.
    if (symbol && news.items.length === 0) {
      news = await fetchFinancialNews({ category });
    }

    const brief = await generateBrief(news.items, symbol);
    return NextResponse.json({ brief, articleCount: news.items.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate brief" },
      { status: 500 },
    );
  }
}
