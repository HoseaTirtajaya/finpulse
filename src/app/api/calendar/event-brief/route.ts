import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { verifyBriefPassword } from "@/lib/ai/brief-auth";
import {
  generateEventBrief,
  type EventBrief,
} from "@/lib/ai/event-brief";
import { getDb, hasDatabase } from "@/lib/db";
import { eventBriefs, macroEvents } from "@/lib/db/schema";
import type { MacroEvent } from "@/lib/news/query-news";

function rowToBrief(row: typeof eventBriefs.$inferSelect): EventBrief {
  const payload = (row.payload ?? {}) as Partial<EventBrief>;
  return {
    id: row.id,
    eventId: row.eventId,
    generatedAt: row.generatedAt.toISOString(),
    summary: row.summary,
    keyPoints: Array.isArray(row.keyPoints) ? row.keyPoints : [],
    marketNotes: Array.isArray(row.marketNotes) ? row.marketNotes : [],
    model: (row.model as EventBrief["model"]) || "gemini",
    disclaimer: payload.disclaimer ?? "",
  };
}

function dbEventToMacro(row: typeof macroEvents.$inferSelect): MacroEvent {
  return {
    id: row.id,
    title: row.title,
    country: row.country,
    impact: row.impact,
    eventAt: row.eventAt.toISOString(),
    actual: row.actual,
    forecast: row.forecast,
    previous: row.previous,
    sector: row.sector,
    eventType: row.eventType,
    sourceUrl: row.sourceUrl,
  };
}

/** Latest cached brief for an event (no password). */
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get("eventId")?.trim() ?? "";
    if (!eventId) {
      return NextResponse.json({ error: "eventId required" }, { status: 400 });
    }
    if (!hasDatabase()) {
      return NextResponse.json({ brief: null });
    }
    const db = getDb();
    const [row] = await db
      .select()
      .from(eventBriefs)
      .where(eq(eventBriefs.eventId, eventId))
      .limit(1);
    return NextResponse.json({ brief: row ? rowToBrief(row) : null });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load event brief" },
      { status: 500 },
    );
  }
}

/** Generate + upsert event brief (password required). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      eventId?: string;
      password?: string;
    };
    const eventId = body.eventId?.trim() ?? "";
    if (!eventId) {
      return NextResponse.json({ error: "eventId required" }, { status: 400 });
    }
    if (!verifyBriefPassword(body.password)) {
      return NextResponse.json(
        { error: "Invalid password", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    if (!hasDatabase()) {
      return NextResponse.json(
        { error: "Database required for event briefs" },
        { status: 503 },
      );
    }

    const db = getDb();
    const [eventRow] = await db
      .select()
      .from(macroEvents)
      .where(eq(macroEvents.id, eventId))
      .limit(1);
    if (!eventRow) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const brief = await generateEventBrief(dbEventToMacro(eventRow));

    await db
      .insert(eventBriefs)
      .values({
        id: brief.id,
        eventId: brief.eventId,
        generatedAt: new Date(brief.generatedAt),
        summary: brief.summary,
        keyPoints: brief.keyPoints,
        marketNotes: brief.marketNotes,
        model: brief.model,
        payload: { disclaimer: brief.disclaimer },
      })
      .onConflictDoUpdate({
        target: eventBriefs.eventId,
        set: {
          id: brief.id,
          generatedAt: new Date(brief.generatedAt),
          summary: brief.summary,
          keyPoints: brief.keyPoints,
          marketNotes: brief.marketNotes,
          model: brief.model,
          payload: { disclaimer: brief.disclaimer },
        },
      });

    return NextResponse.json({ brief });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to generate event brief";
    const isLlm =
      message.includes("LLM") || message.includes("malformed");
    return NextResponse.json(
      { error: message },
      { status: isLlm ? 502 : 500 },
    );
  }
}
