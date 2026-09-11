import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { dailyBars, instruments, sources } from "@/lib/db/schema";
import { mapPool } from "@/lib/ingest/helpers";
import type { AdapterResult } from "@/lib/ingest/rss";
import {
  markSourceSuccess,
  withinCadence,
} from "@/lib/ingest/sources";
import { INSTRUMENTS } from "@/lib/instruments";
import { fetchCandles } from "@/lib/market";

const BAR_CONCURRENCY = 4;
/** Top-up lookback — enough to fill weekends/holidays gaps. */
const TOPUP_RANGE = "1mo";
const BARS_CADENCE_MS = 20 * 60 * 60 * 1000; // ~once per day
const BARS_SOURCE_ID = "daily-bars";

async function upsertBars(
  db: Db,
  symbol: string,
  candles: {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }[],
): Promise<number> {
  if (candles.length === 0) return 0;
  const rows = candles.map((c) => ({
    symbol,
    barDate: c.date,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume ?? null,
  }));
  const CHUNK = 80;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await db
      .insert(dailyBars)
      .values(rows.slice(i, i + CHUNK))
      .onConflictDoUpdate({
        target: [dailyBars.symbol, dailyBars.barDate],
        set: {
          open: sql`excluded.open`,
          high: sql`excluded.high`,
          low: sql`excluded.low`,
          close: sql`excluded.close`,
          volume: sql`excluded.volume`,
        },
      });
  }
  return rows.length;
}

async function listSymbols(db: Db): Promise<string[]> {
  try {
    const rows = await db
      .select({ symbol: instruments.symbol })
      .from(instruments)
      .where(sql`${instruments.enabled} = true`);
    if (rows.length > 0) return rows.map((r) => r.symbol);
  } catch {
    // table may not exist yet during early migrate
  }
  return INSTRUMENTS.map((i) => i.symbol);
}

/** Incremental daily-bar top-up for the instrument universe (~once/day). */
export async function ingestDailyBars(db: Db): Promise<AdapterResult> {
  const result: AdapterResult = { ok: 0, fail: 0, errors: [] };

  try {
    await db
      .insert(sources)
      .values({
        id: BARS_SOURCE_ID,
        name: "Daily Bars Top-up",
        url: "internal://daily-bars",
        scope: "finance",
        market: "global",
        language: "en",
        kind: "daily_bars",
        enabled: true,
        category: "markets",
      })
      .onConflictDoNothing();
  } catch {
    // sources row optional
  }

  const [row] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, BARS_SOURCE_ID))
    .limit(1);
  if (withinCadence(row?.lastSuccessAt, BARS_CADENCE_MS)) {
    return result;
  }

  const symbols = await listSymbols(db);

  await mapPool(symbols, BAR_CONCURRENCY, async (symbol) => {
    try {
      const candles = await fetchCandles(symbol, TOPUP_RANGE);
      await upsertBars(db, symbol, candles);
      result.ok += 1;
    } catch (err) {
      result.fail += 1;
      result.errors.push({
        source: `bars:${symbol}`,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  if (result.ok > 0) {
    await markSourceSuccess(db, BARS_SOURCE_ID);
  }

  return result;
}

export { upsertBars };
