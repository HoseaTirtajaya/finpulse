import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { instrumentFundamentals, instruments, sources } from "@/lib/db/schema";
import { mapPool } from "@/lib/ingest/helpers";
import type { AdapterResult } from "@/lib/ingest/rss";
import {
  markSourceSuccess,
  withinCadence,
} from "@/lib/ingest/sources";
import { INSTRUMENTS } from "@/lib/instruments";
import { fetchWithRetry } from "@/lib/market/http";

const SOURCE_ID = "fundamentals";
const CADENCE_MS = 7 * 24 * 60 * 60 * 1000; // weekly
const CONCURRENCY = 3;

type QuoteSummary = {
  quoteSummary?: {
    result?: Array<{
      price?: {
        marketCap?: { raw?: number };
        regularMarketPrice?: { raw?: number };
      };
      summaryDetail?: {
        trailingPE?: { raw?: number };
        dividendYield?: { raw?: number };
      };
      defaultKeyStatistics?: {
        trailingEps?: { raw?: number };
      };
      assetProfile?: {
        sector?: string;
      };
    }>;
  };
};

async function fetchFundamentals(yahooSymbol: string): Promise<{
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  sector: string | null;
} | null> {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=price,summaryDetail,defaultKeyStatistics,assetProfile`;
  const res = await fetchWithRetry(
    url,
    {
      headers: {
        "User-Agent": "FinPulse/0.4 (research; +localhost)",
        Accept: "application/json",
      },
    },
    { timeoutMs: 10_000, concurrencyKey: `yf-fund:${yahooSymbol}` },
  );
  if (!res) return null;
  const data = (await res.json()) as QuoteSummary;
  const row = data.quoteSummary?.result?.[0];
  if (!row) return null;
  return {
    marketCap: row.price?.marketCap?.raw ?? null,
    peRatio: row.summaryDetail?.trailingPE?.raw ?? null,
    eps: row.defaultKeyStatistics?.trailingEps?.raw ?? null,
    dividendYield: row.summaryDetail?.dividendYield?.raw ?? null,
    sector: row.assetProfile?.sector ?? null,
  };
}

/** Weekly Yahoo quoteSummary refresh into instrument_fundamentals. */
export async function ingestFundamentals(db: Db): Promise<AdapterResult> {
  const result: AdapterResult = { ok: 0, fail: 0, errors: [] };

  try {
    await db
      .insert(sources)
      .values({
        id: SOURCE_ID,
        name: "Instrument Fundamentals",
        url: "internal://fundamentals",
        scope: "finance",
        market: "global",
        language: "en",
        kind: "fundamentals",
        enabled: true,
        category: "equities",
      })
      .onConflictDoNothing();
  } catch {
    // ignore
  }

  const [row] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, SOURCE_ID))
    .limit(1);
  if (withinCadence(row?.lastSuccessAt, CADENCE_MS)) {
    return result;
  }

  let catalog: { symbol: string; yahooSymbol: string | null; type: string }[] =
    [];
  try {
    catalog = await db
      .select({
        symbol: instruments.symbol,
        yahooSymbol: instruments.yahooSymbol,
        type: instruments.type,
      })
      .from(instruments)
      .where(sql`${instruments.enabled} = true`);
  } catch {
    catalog = [];
  }
  if (catalog.length === 0) {
    catalog = INSTRUMENTS.map((i) => ({
      symbol: i.symbol,
      yahooSymbol: i.yahooSymbol,
      type: i.type,
    }));
  }

  // Skip crypto — CoinGecko already covers market cap on the crypto desk.
  const equityLike = catalog.filter(
    (c) => c.type !== "crypto" && c.yahooSymbol,
  );

  await mapPool(equityLike, CONCURRENCY, async (inst) => {
    try {
      const data = await fetchFundamentals(inst.yahooSymbol!);
      if (!data) {
        result.fail += 1;
        return;
      }
      await db
        .insert(instrumentFundamentals)
        .values({
          symbol: inst.symbol,
          marketCap: data.marketCap,
          peRatio: data.peRatio,
          eps: data.eps,
          dividendYield: data.dividendYield,
          sector: data.sector,
          asOf: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: instrumentFundamentals.symbol,
          set: {
            marketCap: sql`excluded.market_cap`,
            peRatio: sql`excluded.pe_ratio`,
            eps: sql`excluded.eps`,
            dividendYield: sql`excluded.dividend_yield`,
            sector: sql`excluded.sector`,
            asOf: new Date(),
            updatedAt: new Date(),
          },
        });
      result.ok += 1;
    } catch (err) {
      result.fail += 1;
      result.errors.push({
        source: `fund:${inst.symbol}`,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  if (result.ok > 0) {
    await markSourceSuccess(db, SOURCE_ID);
  }
  return result;
}
