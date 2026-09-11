import { createHash } from "crypto";
import { eq, sql } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";
import type { Db } from "@/lib/db";
import { macroEvents, sources } from "@/lib/db/schema";
import type { AdapterResult } from "@/lib/ingest/rss";
import {
  markSourceSuccess,
  withinCadence,
} from "@/lib/ingest/sources";

const FF_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml";
const FF_CADENCE_MS = 30 * 60 * 1000;
const SOURCE_ID = "ff-calendar";

function eventId(title: string, country: string, eventAt: Date): string {
  const raw = `${title}|${country}|${eventAt.toISOString()}`;
  return `ff-${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

/** Parse FF calendar XML into normalized rows (pure, testable). */
export function parseForexFactoryCalendar(xml: string): {
  title: string;
  country: string;
  impact: string;
  eventAt: Date;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
}[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: "__cdata",
  });
  const doc = parser.parse(xml);
  const weekly = doc?.weeklyevents?.event;
  const list = Array.isArray(weekly) ? weekly : weekly ? [weekly] : [];

  return list
    .map((ev: Record<string, unknown>) => {
      const title = String(unwrap(ev.title) ?? "").trim();
      const country = String(unwrap(ev.country) ?? "").trim() || "UNK";
      const dateStr = String(unwrap(ev.date) ?? "").trim();
      const timeStr = String(unwrap(ev.time) ?? "").trim();
      const impact = String(unwrap(ev.impact) ?? "Low").toLowerCase();
      if (!title || !dateStr) return null;
      const eventAt = parseFfDateTime(dateStr, timeStr);
      if (!eventAt) return null;
      return {
        title,
        country,
        impact: normalizeImpact(impact),
        eventAt,
        actual: emptyToNull(unwrap(ev.actual)),
        forecast: emptyToNull(unwrap(ev.forecast)),
        previous: emptyToNull(unwrap(ev.previous)),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

function unwrap(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && v !== null && "__cdata" in v) {
    return String((v as { __cdata: unknown }).__cdata);
  }
  return String(v);
}

function emptyToNull(v: string | undefined): string | null {
  if (!v || v === "" || v === "&nbsp;") return null;
  return v.trim();
}

function normalizeImpact(impact: string): string {
  if (impact.includes("high")) return "high";
  if (impact.includes("medium") || impact.includes("med")) return "medium";
  if (impact.includes("holiday")) return "holiday";
  return "low";
}

/** FF dates look like 09-11-2026 with times like 8:30am or All Day. */
export function parseFfDateTime(dateStr: string, timeStr: string): Date | null {
  const m = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hours = 12;
  let minutes = 0;
  const t = timeStr.trim().toLowerCase();
  if (t && t !== "all day" && t !== "tentative") {
    const tm = t.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
    if (tm) {
      hours = Number(tm[1]) % 12;
      if (tm[3] === "pm") hours += 12;
      minutes = Number(tm[2]);
    }
  }
  // FF times are typically US/Eastern; store as UTC wall-clock approximation.
  return new Date(Date.UTC(year, month - 1, day, hours + 4, minutes, 0));
}

export async function ingestForexFactory(db: Db): Promise<AdapterResult> {
  const result: AdapterResult = { ok: 0, fail: 0, errors: [] };
  const [row] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, SOURCE_ID))
    .limit(1);
  if (withinCadence(row?.lastSuccessAt, FF_CADENCE_MS)) {
    return result;
  }

  try {
    const res = await fetch(FF_URL, {
      headers: { "User-Agent": "FinPulse/0.4 (+research aggregator)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      throw new Error(`FF calendar HTTP ${res.status}`);
    }
    const xml = await res.text();
    const events = parseForexFactoryCalendar(xml);
    const rows = events.map((ev) => ({
      id: eventId(ev.title, ev.country, ev.eventAt),
      title: ev.title,
      country: ev.country,
      impact: ev.impact,
      eventAt: ev.eventAt,
      actual: ev.actual,
      forecast: ev.forecast,
      previous: ev.previous,
    }));
    if (rows.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        await db
          .insert(macroEvents)
          .values(chunk)
          .onConflictDoUpdate({
            target: [
              macroEvents.title,
              macroEvents.eventAt,
              macroEvents.country,
            ],
            set: {
              impact: sql`excluded.impact`,
              actual: sql`excluded.actual`,
              forecast: sql`excluded.forecast`,
              previous: sql`excluded.previous`,
              ingestedAt: new Date(),
            },
          });
      }
    }
    await markSourceSuccess(db, SOURCE_ID);
    result.ok += 1;
  } catch (err) {
    result.fail += 1;
    result.errors.push({
      source: "Forex Factory Calendar",
      message: err instanceof Error ? err.message : String(err),
    });
  }
  return result;
}
