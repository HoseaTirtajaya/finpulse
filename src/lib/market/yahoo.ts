import { getInstrument } from "@/lib/instruments";
import { fetchWithRetry, mapConcurrent } from "@/lib/market/http";
import type { MarketDataProvider } from "@/lib/market/provider";
import type { Candle, Quote } from "@/lib/types";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        currency?: string;
        regularMarketTime?: number;
        symbol?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

function resolveYahooSymbol(symbol: string): string {
  const inst = getInstrument(symbol);
  if (inst?.yahooSymbol) {
    return encodeURIComponent(inst.yahooSymbol);
  }
  return encodeURIComponent(symbol);
}

function quoteFromChart(
  symbol: string,
  data: YahooChartResponse,
): Quote | null {
  const result = data?.chart?.result?.[0];
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

function candlesFromChart(data: YahooChartResponse): Candle[] {
  const result = data?.chart?.result?.[0];
  if (!result?.timestamp || !result.indicators?.quote?.[0]) return [];

  const q = result.indicators.quote[0];
  const candles: Candle[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const close = q.close?.[i];
    if (typeof close !== "number") continue;
    candles.push({
      date: new Date(result.timestamp[i] * 1000).toISOString().slice(0, 10),
      open: q.open?.[i] ?? close,
      high: q.high?.[i] ?? close,
      low: q.low?.[i] ?? close,
      close,
      volume: q.volume?.[i] ?? undefined,
    });
  }
  return candles;
}

async function fetchChart(
  symbol: string,
  range: string,
  interval: string,
): Promise<YahooChartResponse | null> {
  const yahoo = resolveYahooSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahoo}?interval=${interval}&range=${range}`;
  const res = await fetchWithRetry(
    url,
    {
      headers: {
        "User-Agent": "FinPulse/0.4 (research; +localhost)",
        Accept: "application/json",
      },
      next: { revalidate: range === "5d" ? 60 : 300 },
    },
    { timeoutMs: 8000, concurrencyKey: `yahoo:${yahoo}:${range}:${interval}` },
  );
  if (!res) return null;
  return (await res.json()) as YahooChartResponse;
}

/**
 * One chart call yields both quote meta and candle series.
 * Prefer range=1y so MA/range scoring and live price share one request.
 */
async function fetchYahooChartBundle(
  symbol: string,
  range = "1y",
): Promise<{ quote: Quote | null; candles: Candle[] }> {
  const data = await fetchChart(symbol, range, "1d");
  if (!data) return { quote: null, candles: [] };
  return {
    quote: quoteFromChart(symbol, data),
    candles: candlesFromChart(data),
  };
}

async function fetchYahooQuote(symbol: string): Promise<Quote | null> {
  // 5d is enough for a live quote and cheaper than 1y when only price is needed.
  const { quote } = await fetchYahooChartBundle(symbol, "5d");
  return quote;
}

async function fetchYahooCandles(
  symbol: string,
  range = "1y",
): Promise<Candle[]> {
  const { candles } = await fetchYahooChartBundle(symbol, range);
  return candles;
}

export const yahooProvider: MarketDataProvider = {
  id: "yahoo",
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const unique = Array.from(
      new Set(symbols.map((s) => s.trim()).filter(Boolean)),
    );
    const results = await mapConcurrent(
      unique,
      async (symbol) => {
        try {
          return await fetchYahooQuote(symbol);
        } catch {
          return null;
        }
      },
      6,
    );
    return results.filter((q): q is Quote => Boolean(q));
  },
  async getCandles(symbol: string, range = "1y"): Promise<Candle[]> {
    try {
      return await fetchYahooCandles(symbol, range);
    } catch {
      return [];
    }
  },
};

export { fetchYahooChartBundle };
