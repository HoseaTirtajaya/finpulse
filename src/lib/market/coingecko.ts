import {
  getCryptoInstruments,
  getInstrument,
  instrumentSymbolForCoingeckoId,
} from "@/lib/instruments";
import { fetchWithRetry } from "@/lib/market/http";
import type { MarketDataProvider } from "@/lib/market/provider";
import type { Candle, CryptoMarketRow, Quote } from "@/lib/types";

const CG_BASE = "https://api.coingecko.com/api/v3";

type CgMarket = {
  id: string;
  symbol: string;
  name: string;
  image?: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price?: number[] };
  last_updated?: string;
};

function cgHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "FinPulse/0.4 (research; +localhost)",
  };
  const key = process.env.COINGECKO_API_KEY?.trim();
  if (key) {
    headers["x-cg-demo-api-key"] = key;
  }
  return headers;
}

async function cgFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const url = path.startsWith("http") ? path : `${CG_BASE}${path}`;
  const res = await fetchWithRetry(
    url,
    {
      ...init,
      headers: { ...cgHeaders(), ...(init?.headers ?? {}) },
      next: { revalidate: 90 },
    },
    { timeoutMs: 12_000, retries: 3, concurrencyKey: `cg:${url}` },
  );
  if (!res) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function mapCgMarket(row: CgMarket): CryptoMarketRow {
  const ticker = (row.symbol || "").toUpperCase();
  const instrumentSymbol =
    instrumentSymbolForCoingeckoId(row.id) ??
    getInstrument(`${ticker}-USD`)?.symbol;

  return {
    rank: row.market_cap_rank ?? 0,
    symbol: ticker,
    name: row.name,
    price: row.current_price ?? 0,
    changePct24h: row.price_change_percentage_24h ?? 0,
    marketCap: row.market_cap ?? 0,
    volume24h: row.total_volume ?? 0,
    sparkline7d: row.sparkline_in_7d?.price,
    imageUrl: row.image,
    coingeckoId: row.id,
    instrumentSymbol,
    asOf: row.last_updated ?? new Date().toISOString(),
  };
}

export function quoteFromCgMarket(
  row: CgMarket,
  appSymbol: string,
): Quote {
  return {
    symbol: appSymbol,
    price: row.current_price ?? 0,
    changePct: row.price_change_percentage_24h ?? 0,
    currency: "USD",
    asOf: row.last_updated ?? new Date().toISOString(),
    source: "live",
    marketCap: row.market_cap ?? undefined,
    volume24h: row.total_volume ?? undefined,
    rank: row.market_cap_rank ?? undefined,
  };
}

export async function fetchCryptoMarkets(
  limit = 50,
): Promise<CryptoMarketRow[]> {
  const perPage = Math.min(Math.max(limit, 1), 100);
  const data = await cgFetch<CgMarket[]>(
    `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=24h`,
  );
  if (!data?.length) return [];
  return data.map(mapCgMarket);
}

async function fetchMarketsByIds(ids: string[]): Promise<CgMarket[]> {
  if (ids.length === 0) return [];
  const unique = Array.from(new Set(ids));
  const data = await cgFetch<CgMarket[]>(
    `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(unique.join(","))}&order=market_cap_desc&per_page=${unique.length}&page=1&sparkline=false&price_change_percentage=24h`,
  );
  return data ?? [];
}

async function getCryptoQuotes(symbols: string[]): Promise<Quote[]> {
  const resolved = symbols.map((s) => {
    const inst = getInstrument(s);
    return {
      appSymbol: s,
      id: inst?.coingeckoId,
    };
  });
  const ids = resolved
    .map((r) => r.id)
    .filter((id): id is string => Boolean(id));
  const markets = await fetchMarketsByIds(ids);
  const byId = new Map(markets.map((m) => [m.id, m]));
  const out: Quote[] = [];
  for (const r of resolved) {
    if (!r.id) continue;
    const row = byId.get(r.id);
    if (!row) continue;
    out.push(quoteFromCgMarket(row, r.appSymbol));
  }
  return out;
}

/** Candles via CoinGecko market_chart (daily). */
async function getCryptoCandles(
  symbol: string,
  range = "1y",
): Promise<Candle[]> {
  const inst = getInstrument(symbol);
  const id = inst?.coingeckoId;
  if (!id) return [];

  const days =
    range === "5d" || range === "1w"
      ? "7"
      : range === "1mo" || range === "30d"
        ? "30"
        : range === "3mo"
          ? "90"
          : range === "5y"
            ? "max"
            : "365";

  const data = await cgFetch<{
    prices?: [number, number][];
  }>(
    `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
  );

  const prices = data?.prices ?? [];
  // Collapse intraday points to one bar per calendar day (last price wins).
  const byDay = new Map<string, number>();
  for (const [ts, price] of prices) {
    const date = new Date(ts).toISOString().slice(0, 10);
    byDay.set(date, price);
  }
  return Array.from(byDay.entries()).map(([date, price]) => ({
    date,
    open: price,
    high: price,
    low: price,
    close: price,
  }));
}

export const coingeckoProvider: MarketDataProvider = {
  id: "coingecko",
  getQuotes: getCryptoQuotes,
  getCandles: getCryptoCandles,
};

export function cryptoCatalogCoingeckoIds(): string[] {
  return getCryptoInstruments()
    .map((i) => i.coingeckoId)
    .filter((id): id is string => Boolean(id));
}
