import { and, asc, gte, inArray, lte } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import { macroEvents } from "@/lib/db/schema";
import type { Instrument } from "@/lib/types";
import type { MacroEvent } from "@/lib/news/query-news";

/** Country / currency codes that may appear on calendar rows for a currency. */
const CURRENCY_ALIASES: Record<string, string[]> = {
  USD: ["USD", "US", "USA"],
  EUR: ["EUR", "EMU", "EU", "DE", "FR", "IT", "ES"],
  GBP: ["GBP", "UK", "GB"],
  JPY: ["JPY", "JP"],
  HKD: ["HKD", "HK"],
  IDR: ["IDR", "ID"],
  CHF: ["CHF", "CH"],
  AUD: ["AUD", "AU"],
  NZD: ["NZD", "NZ"],
  CAD: ["CAD", "CA"],
  CNY: ["CNY", "CN"],
  KRW: ["KRW", "KR"],
  TWD: ["TWD", "TW"],
};

function expandCodes(codes: string[]): string[] {
  const out = new Set<string>();
  for (const code of codes) {
    const upper = code.trim().toUpperCase();
    if (!upper) continue;
    out.add(upper);
    const aliases = CURRENCY_ALIASES[upper];
    if (aliases) {
      for (const a of aliases) out.add(a);
    }
    for (const [currency, list] of Object.entries(CURRENCY_ALIASES)) {
      if (list.includes(upper)) out.add(currency);
    }
  }
  return [...out];
}

/** FX legs from a pair symbol like EURUSD / USDIDR. */
export function fxLegsFromSymbol(symbol: string): string[] {
  const cleaned = symbol.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (cleaned.length === 6) {
    return [cleaned.slice(0, 3), cleaned.slice(3, 6)];
  }
  return [];
}

/**
 * Country/currency codes used to match `macro_events.country` for an instrument.
 */
export function countryCodesForInstrument(instrument: Instrument): string[] {
  if (instrument.type === "fx") {
    const legs = fxLegsFromSymbol(instrument.symbol);
    if (legs.length === 2) return expandCodes(legs);
  }
  if (instrument.type === "crypto") {
    return expandCodes(["USD"]);
  }

  const codes = new Set<string>([instrument.currency]);
  switch (instrument.market) {
    case "US":
      codes.add("USD");
      codes.add("US");
      break;
    case "EU":
      codes.add("EUR");
      codes.add("EU");
      break;
    case "ID":
      codes.add("IDR");
      codes.add("ID");
      break;
    case "Asia":
      if (instrument.currency === "JPY") {
        codes.add("JP");
      } else if (instrument.currency === "HKD") {
        codes.add("HK");
      } else {
        codes.add("JPY");
        codes.add("HKD");
      }
      break;
    default:
      break;
  }
  return expandCodes([...codes]);
}

export type UpcomingEventsOptions = {
  /** Lookahead window in days (default 7). */
  days?: number;
  /** Prefer high/medium only (default true). */
  highMediumOnly?: boolean;
  limit?: number;
};

/**
 * Upcoming macro events relevant to an instrument (currency / FX legs).
 * Returns [] when DB is unset or query fails — never throws.
 */
export async function getUpcomingEventsForInstrument(
  instrument: Instrument,
  options: UpcomingEventsOptions = {},
): Promise<MacroEvent[]> {
  if (!hasDatabase()) return [];

  const days = options.days ?? 7;
  const highMediumOnly = options.highMediumOnly ?? true;
  const limit = options.limit ?? 24;
  const countries = countryCodesForInstrument(instrument);
  if (countries.length === 0) return [];

  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

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
          gte(macroEvents.eventAt, now),
          lte(macroEvents.eventAt, until),
          inArray(macroEvents.country, countries),
          highMediumOnly
            ? inArray(macroEvents.impact, ["high", "medium"])
            : undefined,
        ),
      )
      .orderBy(asc(macroEvents.eventAt))
      .limit(limit);

    return rows.map((r) => ({
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
    }));
  } catch (err) {
    console.error("getUpcomingEventsForInstrument failed", err);
    return [];
  }
}
