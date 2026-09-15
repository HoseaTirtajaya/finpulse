import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { verifyBriefPassword } from "@/lib/ai/brief-auth";
import {
  buildPriceContext,
  generateInstrumentReview,
  type InstrumentReview,
} from "@/lib/ai/instrument-review";
import { getCachedCandles, getCachedQuotes } from "@/lib/cache";
import { getDb, hasDatabase } from "@/lib/db";
import { instrumentReviews } from "@/lib/db/schema";
import { getInstrument } from "@/lib/instruments";
import { getUpcomingEventsForInstrument } from "@/lib/macro/events-for-instrument";

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

function rowToReview(row: typeof instrumentReviews.$inferSelect): InstrumentReview {
  const payload = (row.payload ?? {}) as Partial<InstrumentReview>;
  return {
    id: row.id,
    instrument: row.instrument,
    generatedAt: row.generatedAt.toISOString(),
    stance: (row.stance as InstrumentReview["stance"]) || "neutral",
    confidence:
      (row.confidence as InstrumentReview["confidence"]) || "low",
    summary: row.summary,
    rationale: Array.isArray(payload.rationale) ? payload.rationale : [],
    risks: Array.isArray(payload.risks) ? payload.risks : [],
    contextEventIds: Array.isArray(row.contextEventIds)
      ? row.contextEventIds
      : [],
    model: (row.model as InstrumentReview["model"]) || "gemini",
    disclaimer: payload.disclaimer ?? "",
  };
}

/** Latest cached review for symbol (read-only, no password). */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { symbol: raw } = await context.params;
    const instrument = getInstrument(decodeURIComponent(raw).trim());
    if (!instrument) {
      return NextResponse.json({ error: "Unknown instrument" }, { status: 404 });
    }
    const symbol = instrument.symbol;
    if (!hasDatabase()) {
      return NextResponse.json({ review: null });
    }
    const db = getDb();
    const [row] = await db
      .select()
      .from(instrumentReviews)
      .where(eq(instrumentReviews.instrument, symbol))
      .orderBy(desc(instrumentReviews.generatedAt))
      .limit(1);
    return NextResponse.json({ review: row ? rowToReview(row) : null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load review" },
      { status: 500 },
    );
  }
}

/** Generate + store a new review (password required). */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { symbol: raw } = await context.params;
    const instrument = getInstrument(decodeURIComponent(raw).trim());
    if (!instrument) {
      return NextResponse.json({ error: "Unknown instrument" }, { status: 404 });
    }
    const symbol = instrument.symbol;

    const body = (await request.json()) as { password?: string };
    if (!verifyBriefPassword(body.password)) {
      return NextResponse.json(
        { error: "Invalid password", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const [quotes, candles, events] = await Promise.all([
      getCachedQuotes(symbol),
      getCachedCandles(symbol, "3mo"),
      getUpcomingEventsForInstrument(instrument, { days: 7 }),
    ]);

    const priceContext = buildPriceContext(quotes[0] ?? null, candles);
    const review = await generateInstrumentReview({
      symbol,
      events,
      priceContext,
    });

    if (hasDatabase()) {
      const db = getDb();
      await db.insert(instrumentReviews).values({
        id: review.id,
        instrument: review.instrument,
        generatedAt: new Date(review.generatedAt),
        stance: review.stance,
        confidence: review.confidence,
        summary: review.summary,
        contextEventIds: review.contextEventIds,
        model: review.model,
        payload: {
          rationale: review.rationale,
          risks: review.risks,
          disclaimer: review.disclaimer,
        },
      });
    }

    return NextResponse.json({ review, eventCount: events.length });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to generate review";
    const isLlm =
      message.includes("LLM") || message.includes("malformed");
    return NextResponse.json(
      { error: message },
      { status: isLlm ? 502 : 500 },
    );
  }
}
