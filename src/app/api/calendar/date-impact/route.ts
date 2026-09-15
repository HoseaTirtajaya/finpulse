import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { verifyBriefPassword } from "@/lib/ai/brief-auth";
import {
  buildBasketContext,
  DATE_IMPACT_BASKET,
  generateDateImpact,
  type DateImpact,
} from "@/lib/ai/date-impact";
import { getCachedCandles, getCachedQuotes } from "@/lib/cache";
import { getDb, hasDatabase } from "@/lib/db";
import { dateImpacts } from "@/lib/db/schema";
import { parseIsoDateUtc } from "@/lib/macro/date-format";
import { queryMacroEventsForDay } from "@/lib/macro/query-calendar";

function rowToImpact(row: typeof dateImpacts.$inferSelect): DateImpact {
  const payload = (row.payload ?? {}) as Partial<DateImpact>;
  return {
    id: row.id,
    eventDate: row.eventDate,
    generatedAt: row.generatedAt.toISOString(),
    marketLean: (row.marketLean as DateImpact["marketLean"]) || "unclear",
    confidence: (row.confidence as DateImpact["confidence"]) || "low",
    summary: row.summary,
    scenarios: Array.isArray(payload.scenarios) ? payload.scenarios : [],
    trends: Array.isArray(payload.trends) ? payload.trends : [],
    risks: Array.isArray(payload.risks) ? payload.risks : [],
    contextEventIds: Array.isArray(row.contextEventIds)
      ? row.contextEventIds
      : [],
    model: (row.model as DateImpact["model"]) || "gemini",
    disclaimer: payload.disclaimer ?? "",
  };
}

export async function GET(request: NextRequest) {
  try {
    const isoDate = request.nextUrl.searchParams.get("date")?.trim() ?? "";
    if (!parseIsoDateUtc(isoDate)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (!hasDatabase()) {
      return NextResponse.json({ impact: null });
    }
    const db = getDb();
    const [row] = await db
      .select()
      .from(dateImpacts)
      .where(eq(dateImpacts.eventDate, isoDate))
      .orderBy(desc(dateImpacts.generatedAt))
      .limit(1);
    return NextResponse.json({ impact: row ? rowToImpact(row) : null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load date impact" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      date?: string;
      password?: string;
    };
    const isoDate = body.date?.trim() ?? "";
    if (!parseIsoDateUtc(isoDate)) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (!verifyBriefPassword(body.password)) {
      return NextResponse.json(
        { error: "Invalid password", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const events = await queryMacroEventsForDay(isoDate, {
      minImpact: "low",
      limit: 200,
    });

    const symbolsKey = DATE_IMPACT_BASKET.join(",");
    const quotes = await getCachedQuotes(symbolsKey);
    const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

    const basket = await Promise.all(
      DATE_IMPACT_BASKET.map(async (symbol) => {
        const candles = await getCachedCandles(symbol, "3mo");
        return buildBasketContext(
          symbol,
          quoteBySymbol.get(symbol) ?? null,
          candles,
        );
      }),
    );

    const impact = await generateDateImpact({
      eventDate: isoDate,
      events,
      basket,
    });

    if (hasDatabase()) {
      const db = getDb();
      await db.insert(dateImpacts).values({
        id: impact.id,
        eventDate: impact.eventDate,
        generatedAt: new Date(impact.generatedAt),
        marketLean: impact.marketLean,
        confidence: impact.confidence,
        summary: impact.summary,
        contextEventIds: impact.contextEventIds,
        model: impact.model,
        payload: {
          scenarios: impact.scenarios,
          trends: impact.trends,
          risks: impact.risks,
          disclaimer: impact.disclaimer,
        },
      });
    }

    return NextResponse.json({ impact, eventCount: events.length });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to generate date impact";
    const isLlm =
      message.includes("LLM") || message.includes("malformed");
    return NextResponse.json(
      { error: message },
      { status: isLlm ? 502 : 500 },
    );
  }
}
