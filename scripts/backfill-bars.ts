import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

/**
 * One-shot 5y daily bar backfill. Run after seed-instruments + db:push.
 * Uses bounded concurrency to stay polite to Yahoo/CoinGecko free tiers.
 */
async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required. Set it in .env.local");
    process.exit(1);
  }

  const { getDb } = await import("../src/lib/db");
  const { instruments } = await import("../src/lib/db/schema");
  const { INSTRUMENTS } = await import("../src/lib/instruments");
  const { fetchCandles } = await import("../src/lib/market");
  const { upsertBars } = await import("../src/lib/ingest/daily-bars");
  const { mapPool } = await import("../src/lib/ingest/helpers");
  const { eq } = await import("drizzle-orm");

  const db = getDb();
  let symbols: string[] = [];
  try {
    const rows = await db
      .select({ symbol: instruments.symbol })
      .from(instruments)
      .where(eq(instruments.enabled, true));
    symbols = rows.map((r) => r.symbol);
  } catch {
    symbols = [];
  }
  if (symbols.length === 0) {
    symbols = INSTRUMENTS.map((i) => i.symbol);
  }

  console.log(`Backfilling 5y bars for ${symbols.length} symbols…`);
  let ok = 0;
  let fail = 0;

  await mapPool(symbols, 3, async (symbol) => {
    try {
      const candles = await fetchCandles(symbol, "5y");
      const n = await upsertBars(db, symbol, candles);
      ok += 1;
      console.log(`  ${symbol}: ${n} bars`);
    } catch (err) {
      fail += 1;
      console.error(
        `  ${symbol}: FAIL`,
        err instanceof Error ? err.message : err,
      );
    }
  });

  console.log(JSON.stringify({ ok, fail }, null, 2));
  if (fail > 0 && ok === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
