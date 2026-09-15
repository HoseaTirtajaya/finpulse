import { createHash } from "crypto";
import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { macroEvents, sources } from "@/lib/db/schema";
import type { AdapterResult } from "@/lib/ingest/rss";
import {
  markSourceSuccess,
  withinCadence,
} from "@/lib/ingest/sources";
import { fetchWithRetry } from "@/lib/market/http";

const SOURCE_ID = "finnhub-economic";
const CADENCE_MS = 30 * 60 * 1000;
const FINNHUB_URL = "https://finnhub.io/api/v1/calendar/economic";
/** Free keyless JSON calendar — used when Finnhub plan lacks economic calendar. */
const BIQUOTE_URL = "https://biquote.io/api/calendar";

export type FinnhubEconomicEvent = {
  actual?: number | string | null;
  country?: string | null;
  estimate?: number | string | null;
  event?: string | null;
  impact?: string | null;
  prev?: number | string | null;
  time?: string | null;
  unit?: string | null;
};

export type NormalizedMacroEvent = {
  title: string;
  country: string;
  impact: string;
  eventAt: Date;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  sector: string | null;
  eventType: string | null;
  sourceUrl: string | null;
};

function eventId(
  prefix: string,
  title: string,
  country: string,
  eventAt: Date,
): string {
  const raw = `${title}|${country}|${eventAt.toISOString()}`;
  return `${prefix}-${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

function formatValue(
  value: number | string | null | undefined,
  unit?: string | null,
): string | null {
  if (value == null || value === "") return null;
  const base = typeof value === "number" ? String(value) : String(value).trim();
  if (!base) return null;
  const u = (unit ?? "").trim().toLowerCase();
  if (!u || u === "none" || u === "currency" || u === "people") return base;
  if (u === "percent" || u === "%") {
    return base.includes("%") ? base : `${base}%`;
  }
  if (!base.includes(u)) return `${base} ${u}`.trim();
  return base;
}

export function normalizeImpact(impact: string | null | undefined): string {
  const raw = (impact ?? "low").toLowerCase();
  if (raw.includes("high") || raw === "3") return "high";
  if (raw.includes("medium") || raw.includes("med") || raw === "2")
    return "medium";
  if (raw.includes("holiday")) return "holiday";
  return "low";
}

/** Parse Finnhub economic calendar JSON into normalized rows (pure, testable). */
export function parseFinnhubCalendar(
  payload: unknown,
): NormalizedMacroEvent[] {
  const root = payload as { economicCalendar?: FinnhubEconomicEvent[] } | null;
  const list = Array.isArray(root?.economicCalendar)
    ? root!.economicCalendar!
    : [];

  return list
    .map((ev): NormalizedMacroEvent | null => {
      const title = String(ev.event ?? "").trim();
      const country = String(ev.country ?? "").trim().toUpperCase() || "UNK";
      const timeStr = String(ev.time ?? "").trim();
      if (!title || !timeStr) return null;
      const eventAt = new Date(timeStr);
      if (Number.isNaN(eventAt.getTime())) return null;
      return {
        title,
        country,
        impact: normalizeImpact(ev.impact),
        eventAt,
        actual: formatValue(ev.actual, ev.unit),
        forecast: formatValue(ev.estimate, ev.unit),
        previous: formatValue(ev.prev, ev.unit),
        sector: null,
        eventType: null,
        sourceUrl: null,
      };
    })
    .filter((x): x is NormalizedMacroEvent => x != null);
}

type BiquoteEvent = {
  id?: string;
  time?: string;
  currency?: string;
  countryCode?: string;
  name?: string;
  importance?: string;
  unit?: string;
  actual?: number | string | null;
  forecast?: number | string | null;
  previous?: number | string | null;
  type?: string;
  sector?: string;
  sourceUrl?: string;
};

/** Parse biquote calendar JSON (array) into normalized rows. */
export function parseBiquoteCalendar(payload: unknown): NormalizedMacroEvent[] {
  const list = Array.isArray(payload) ? (payload as BiquoteEvent[]) : [];
  return list
    .map((ev) => {
      const title = String(ev.name ?? "").trim();
      // Prefer currency (USD/EUR) for FX matching; fall back to country code.
      const country =
        String(ev.currency ?? ev.countryCode ?? "")
          .trim()
          .toUpperCase() || "UNK";
      const timeStr = String(ev.time ?? "").trim();
      if (!title || !timeStr) return null;
      const eventAt = new Date(timeStr);
      if (Number.isNaN(eventAt.getTime())) return null;
      const unit = ev.unit === "percent" ? "percent" : ev.unit;
      const sector = String(ev.sector ?? "").trim() || null;
      const eventType = String(ev.type ?? "").trim() || null;
      const sourceUrl = String(ev.sourceUrl ?? "").trim() || null;
      return {
        title,
        country,
        impact: normalizeImpact(ev.importance),
        eventAt,
        actual: formatValue(ev.actual, unit),
        forecast: formatValue(ev.forecast, unit),
        previous: formatValue(ev.previous, unit),
        sector,
        eventType,
        sourceUrl,
      };
    })
    .filter((x): x is NormalizedMacroEvent => x != null);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchFinnhubEvents(
  apiKey: string,
  from: string,
  to: string,
): Promise<NormalizedMacroEvent[]> {
  const url = `${FINNHUB_URL}?from=${from}&to=${to}`;
  const res = await fetch(url, {
    headers: {
      "X-Finnhub-Token": apiKey,
      Accept: "application/json",
      "User-Agent": "FinPulse/0.4 (+research aggregator)",
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  if (res.status === 403) {
    throw new Error(
      "Finnhub plan does not include /calendar/economic (403). Using fallback.",
    );
  }
  if (res.status === 429) {
    throw new Error("Finnhub rate limited (429)");
  }
  if (!res.ok) {
    throw new Error(`Finnhub calendar HTTP ${res.status}: ${text.slice(0, 180)}`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Finnhub calendar returned invalid JSON");
  }
  return parseFinnhubCalendar(payload);
}

async function fetchBiquoteEvents(
  from: string,
  to: string,
): Promise<NormalizedMacroEvent[]> {
  // Fetch high + medium separately so the ~200-item cap isn't filled with lows.
  const parts = await Promise.all(
    (["high", "medium"] as const).map(async (importance) => {
      const url = `${BIQUOTE_URL}?from=${from}&to=${to}&importance=${importance}`;
      const res = await fetchWithRetry(
        url,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "FinPulse/0.4 (+research aggregator)",
          },
        },
        {
          retries: 3,
          timeoutMs: 15000,
          concurrencyKey: `biquote-economic-${importance}`,
        },
      );
      if (!res) return [] as NormalizedMacroEvent[];
      const payload = (await res.json()) as unknown;
      return parseBiquoteCalendar(payload);
    }),
  );
  return parts.flat();
}

async function upsertEvents(
  db: Db,
  events: NormalizedMacroEvent[],
  source: string,
  idPrefix: string,
): Promise<number> {
  // Dedupe within the batch — Postgres rejects ON CONFLICT affecting the same
  // row twice in one INSERT (biquote often emits duplicate title/time/country).
  const byKey = new Map<string, NormalizedMacroEvent>();
  for (const ev of events) {
    const key = `${ev.title}|${ev.eventAt.toISOString()}|${ev.country}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, ev);
      continue;
    }
    const score = (e: NormalizedMacroEvent) =>
      Number(Boolean(e.actual)) +
      Number(Boolean(e.forecast)) +
      Number(Boolean(e.previous));
    if (score(ev) >= score(prev)) byKey.set(key, ev);
  }

  const rows = [...byKey.values()].map((ev) => ({
    id: eventId(idPrefix, ev.title, ev.country, ev.eventAt),
    title: ev.title,
    country: ev.country,
    impact: ev.impact,
    eventAt: ev.eventAt,
    actual: ev.actual,
    forecast: ev.forecast,
    previous: ev.previous,
    sector: ev.sector,
    eventType: ev.eventType,
    sourceUrl: ev.sourceUrl,
    source,
  }));
  if (rows.length === 0) return 0;

  const CHUNK = 40;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db
      .insert(macroEvents)
      .values(chunk)
      .onConflictDoUpdate({
        target: [macroEvents.title, macroEvents.eventAt, macroEvents.country],
        set: {
          impact: sql`excluded.impact`,
          actual: sql`excluded.actual`,
          forecast: sql`excluded.forecast`,
          previous: sql`excluded.previous`,
          sector: sql`excluded.sector`,
          eventType: sql`excluded.event_type`,
          sourceUrl: sql`excluded.source_url`,
          source: sql`excluded.source`,
          ingestedAt: new Date(),
        },
      });
  }
  return rows.length;
}

/**
 * Ingest economic calendar: Finnhub when the plan allows it,
 * otherwise free biquote JSON API (not scraped).
 */
export async function ingestFinnhubCalendar(db: Db): Promise<AdapterResult> {
  const result: AdapterResult = { ok: 0, fail: 0, errors: [] };
  const [row] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, SOURCE_ID))
    .limit(1);
  if (withinCadence(row?.lastSuccessAt, CADENCE_MS)) {
    return result;
  }

  const from = ymd(new Date());
  const to = ymd(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const apiKey = process.env.FINNHUB_API_KEY?.trim();

  try {
    let events: NormalizedMacroEvent[] = [];
    let source = "finnhub";
    let idPrefix = "fh";
    let usedFallback = false;

    if (apiKey) {
      try {
        events = await fetchFinnhubEvents(apiKey, from, to);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("Finnhub calendar unavailable, trying biquote:", msg);
        usedFallback = true;
        events = await fetchBiquoteEvents(from, to);
        source = "biquote";
        idPrefix = "bq";
        // Informational only — do not count as ingest failure.
        console.warn(
          `Fell back to biquote (${events.length} raw events). Reason: ${msg}`,
        );
      }
    } else {
      usedFallback = true;
      events = await fetchBiquoteEvents(from, to);
      source = "biquote";
      idPrefix = "bq";
      console.warn(
        `FINNHUB_API_KEY is not set. Using biquote (${events.length} raw events).`,
      );
    }

    if (!usedFallback && events.length === 0) {
      // Empty Finnhub window — still try fallback for coverage.
      const fallback = await fetchBiquoteEvents(from, to);
      if (fallback.length > 0) {
        events = fallback;
        source = "biquote";
        idPrefix = "bq";
      }
    }

    const count = await upsertEvents(db, events, source, idPrefix);
    await markSourceSuccess(db, SOURCE_ID);
    result.ok += 1;
    if (count === 0) {
      result.errors.push({
        source: "Economic Calendar",
        message: "Ingest succeeded but returned 0 events for the next 7 days.",
      });
    }
  } catch (err) {
    result.fail += 1;
    result.errors.push({
      source: "Economic Calendar",
      message: err instanceof Error ? err.message : String(err),
    });
  }
  return result;
}
