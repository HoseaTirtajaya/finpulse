import { NextRequest, NextResponse } from "next/server";
import { generateBrief } from "@/lib/ai/analyze";
import { verifyBriefPassword } from "@/lib/ai/brief-auth";
import { getInstrument } from "@/lib/instruments";
import { getCachedNews, getCachedQuotes } from "@/lib/cache";
import { matchesInstrument } from "@/lib/news/match-instrument";
import type { NewsScope } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      symbol?: string;
      category?: string;
      scope?: NewsScope;
      password?: string;
    };

    if (!verifyBriefPassword(body.password)) {
      return NextResponse.json(
        { error: "Invalid password", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const symbol = body.symbol?.trim();
    const scope = body.scope ?? "finance";
    const category = body.category || "all";
    const instrument = symbol ? getInstrument(symbol) : undefined;

    let news = await getCachedNews({ scope, symbol, category });
    if (symbol && news.items.length === 0) {
      news = await getCachedNews({ scope, category });
    }

    if (instrument) {
      const [finance, trending] = await Promise.all([
        getCachedNews({ scope: "finance", category: "all" }),
        getCachedNews({ scope: "trending" }),
      ]);
      const seen = new Set<string>();
      const related = [...finance.items, ...trending.items].filter((item) => {
        if (seen.has(item.id)) return false;
        const ok = matchesInstrument(
          item,
          instrument.symbol,
          instrument.name,
          instrument.aliases,
        );
        if (ok) seen.add(item.id);
        return ok;
      });
      if (related.length > 0) {
        news = { ...news, items: related.slice(0, 16) };
      }
    }

    const quotes = symbol
      ? await getCachedQuotes(symbol)
      : ([] as Awaited<ReturnType<typeof getCachedQuotes>>);
    const brief = await generateBrief(
      news.items,
      symbol,
      scope,
      quotes[0] ?? null,
    );
    return NextResponse.json({ brief, articleCount: news.items.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate brief" },
      { status: 500 },
    );
  }
}
