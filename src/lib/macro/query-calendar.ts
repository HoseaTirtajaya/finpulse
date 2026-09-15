import { and, asc, eq, gte, lte, or, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import { macroEvents } from "@/lib/db/schema";
import {
  parseIsoDateUtc,
  toIsoDateUtc,
  utcDayEnd,
} from "@/lib/macro/date-format";
import type { MacroEvent } from "@/lib/news/query-news";

export type DayMarkerCounts = { high: number; medium: number };

export type DayMarkers = Record<string, DayMarkerCounts>;

function impactFilter(min: "high" | "medium" | "low" | undefined) {
  if (min === "high") return eq(macroEvents.impact, "high");
  if (min === "low" || min == null) return undefined;
  return or(eq(macroEvents.impact, "high"), eq(macroEvents.impact, "medium"));
}

function mapMacro(r: {
  id: string;
  title: string;
  country: string;
  impact: string;
  eventAt: Date;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  sector?: string | null;
  eventType?: string | null;
  sourceUrl?: string | null;
}): MacroEvent {
  return {
    id: r.id,
    title: r.title,
    country: r.country,
    impact: r.impact,
    eventAt: r.eventAt.toISOString(),
    actual: r.actual,
    forecast: r.forecast,
    previous: r.previous,
    sector: r.sector ?? null,
    eventType: r.eventType ?? null,
    sourceUrl: r.sourceUrl ?? null,
  };
}

/**
 * Macro events in an inclusive UTC datetime range (not limited to future-only).
 */
export async function queryMacroEventsInRange(options: {
  from: Date;
  to: Date;
  minImpact?: "high" | "medium" | "low";
  limit?: number;
}): Promise<MacroEvent[]> {
  if (!hasDatabase()) return [];
  const limit = options.limit ?? 500;
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: macroEvents.id,
        title: macroEvents.title,
        country: macroEvents.country,
        impact: macroEvents.impact,
        eventAt: macroEvents.eventAt,
        actual: macroEvents.actual,
        forecast: macroEvents.forecast,
        previous: macroEvents.previous,
        sector: macroEvents.sector,
        eventType: macroEvents.eventType,
        sourceUrl: macroEvents.sourceUrl,
      })
      .from(macroEvents)
      .where(
        and(
          gte(macroEvents.eventAt, options.from),
          lte(macroEvents.eventAt, options.to),
          impactFilter(options.minImpact ?? "medium"),
        ),
      )
      .orderBy(asc(macroEvents.eventAt))
      .limit(limit);
    return rows.map(mapMacro);
  } catch (err) {
    console.error("queryMacroEventsInRange failed", err);
    return [];
  }
}

/** Events on a single UTC calendar day (YYYY-MM-DD). */
export async function queryMacroEventsForDay(
  isoDate: string,
  options?: { minImpact?: "high" | "medium" | "low"; limit?: number },
): Promise<MacroEvent[]> {
  const start = parseIsoDateUtc(isoDate);
  const end = utcDayEnd(isoDate);
  if (!start || !end) return [];
  return queryMacroEventsInRange({
    from: start,
    to: end,
    minImpact: options?.minImpact ?? "low",
    limit: options?.limit ?? 200,
  });
}

/**
 * High/medium event counts per UTC day for a month (1–12).
 * Keys are YYYY-MM-DD.
 */
export async function getMacroEventDayMarkers(
  year: number,
  month: number,
): Promise<DayMarkers> {
  if (!hasDatabase()) return {};
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  try {
    const db = getDb();
    const rows = await db
      .select({
        eventAt: macroEvents.eventAt,
        impact: macroEvents.impact,
      })
      .from(macroEvents)
      .where(
        and(
          gte(macroEvents.eventAt, from),
          lte(macroEvents.eventAt, to),
          or(eq(macroEvents.impact, "high"), eq(macroEvents.impact, "medium")),
        ),
      );

    const markers: DayMarkers = {};
    for (const row of rows) {
      const key = toIsoDateUtc(row.eventAt);
      if (!markers[key]) markers[key] = { high: 0, medium: 0 };
      if (row.impact === "high") markers[key].high += 1;
      else if (row.impact === "medium") markers[key].medium += 1;
    }
    return markers;
  } catch (err) {
    console.error("getMacroEventDayMarkers failed", err);
    return {};
  }
}

/** High/medium events for a whole UTC month. */
export async function queryMacroEventsForMonth(
  year: number,
  month: number,
): Promise<MacroEvent[]> {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return queryMacroEventsInRange({
    from,
    to,
    minImpact: "medium",
    limit: 500,
  });
}

/** Shift an ISO date by N days (UTC). */
export function shiftIsoDate(isoDate: string, days: number): string | null {
  const start = parseIsoDateUtc(isoDate);
  if (!start) return null;
  const next = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return toIsoDateUtc(next);
}

/** Expose sql helper for rare callers (kept for symmetry with query-news). */
export { sql };
