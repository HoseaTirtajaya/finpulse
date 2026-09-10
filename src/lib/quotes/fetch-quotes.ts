import { INSTRUMENTS } from "@/lib/instruments";
import type { Quote } from "@/lib/types";

/** Map FinPulse symbols to Yahoo Finance chart tickers. */
export function toYahooSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s === "EURUSD") return "EURUSD=X";
  if (s === "^VIX" || s === "VIX") return "%5EVIX";
  if (s === "BTC-USD" || s === "BTC") return "BTC-USD";
  return encodeURIComponent(s);
}

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        currency?: string;
        regularMarketTime?: number;
      };
      indicators?: {
        quote?: Array<{
          close?: Array<number | null>;
        }>;
      };
    }>;
  };
};

async function fetchYahooQuote(symbol: string): Promise<Quote | null> {
  const yahoo = toYahooSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahoo}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "FinPulse/0.2 (research; +localhost)",
      Accept: "application/json",
    },
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta?.regularMarketPrice) return null;

  const price = meta.regularMarketPrice;
  const prev =
    meta.chartPreviousClose ??
    meta.previousClose ??
    result?.indicators?.quote?.[0]?.close
      ?.filter((v): v is number => typeof v === "number")
      .at(-2);

  const changePct =
    prev && prev !== 0 ? ((price - prev) / prev) * 100 : 0;

  return {
    symbol,
    price,
    changePct,
    currency: meta.currency,
    asOf: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
    source: "live",
  };
}

function demoQuote(symbol: string): Quote | null {
  const inst = INSTRUMENTS.find(
    (i) => i.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  if (!inst) return null;
  return {
    symbol: inst.symbol,
    price: inst.lastPrice,
    changePct: inst.changePct,
    asOf: new Date().toISOString(),
    source: "demo",
  };
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const unique = Array.from(
    new Set(symbols.map((s) => s.trim()).filter(Boolean)),
  );
  const settled = await Promise.allSettled(
    unique.map(async (symbol) => {
      try {
        const live = await fetchYahooQuote(symbol);
        if (live) return live;
      } catch {
        /* fall through */
      }
      return demoQuote(symbol);
    }),
  );

  return settled
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((q): q is Quote => Boolean(q));
}

export async function fetchAllWatchlistQuotes(): Promise<Quote[]> {
  return fetchQuotes(INSTRUMENTS.map((i) => i.symbol));
}
