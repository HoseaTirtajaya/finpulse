import { NextRequest, NextResponse } from "next/server";
import { generateBrief } from "@/lib/ai/analyze";
import { getCachedNews } from "@/lib/cache";
import type { NewsScope } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      symbol?: string;
      category?: string;
      scope?: NewsScope;
    };
    const symbol = body.symbol?.trim();
    const scope = body.scope ?? "finance";
    const category = body.category || "all";

    let news = await getCachedNews({ scope, symbol, category });
    if (symbol && news.items.length === 0) {
      news = await getCachedNews({ scope, category });
    }

    const brief = await generateBrief(news.items, symbol, scope);
    return NextResponse.json({ brief, articleCount: news.items.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate brief" },
      { status: 500 },
    );
  }
}
