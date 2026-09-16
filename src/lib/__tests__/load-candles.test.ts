import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import type { Candle } from "@/lib/types";
import {
  detectHasOhlc,
  isCandleRange,
  rangeToDays,
} from "@/lib/market/load-candles";

function bar(
  date: string,
  close: number,
  opts?: Partial<Pick<Candle, "open" | "high" | "low">>,
): Candle {
  return {
    date,
    open: opts?.open ?? close,
    high: opts?.high ?? close,
    low: opts?.low ?? close,
    close,
  };
}

describe("rangeToDays / isCandleRange", () => {
  it("maps ranges to lookback days", () => {
    expect(rangeToDays("1mo")).toBe(30);
    expect(rangeToDays("3mo")).toBe(90);
    expect(rangeToDays("1y")).toBe(365);
    expect(rangeToDays("5y")).toBe(1825);
  });

  it("validates range strings", () => {
    expect(isCandleRange("1y")).toBe(true);
    expect(isCandleRange("2y")).toBe(false);
    expect(isCandleRange("")).toBe(false);
  });
});

describe("detectHasOhlc", () => {
  it("returns false for flat CoinGecko-style bars", () => {
    const candles = Array.from({ length: 10 }, (_, i) =>
      bar(`2024-01-${String(i + 1).padStart(2, "0")}`, 100 + i),
    );
    expect(detectHasOhlc(candles)).toBe(false);
  });

  it("returns true when most bars have high > low", () => {
    const candles = Array.from({ length: 10 }, (_, i) =>
      bar(`2024-01-${String(i + 1).padStart(2, "0")}`, 100 + i, {
        open: 99 + i,
        high: 102 + i,
        low: 98 + i,
      }),
    );
    expect(detectHasOhlc(candles)).toBe(true);
  });

  it("returns false when too few bars", () => {
    expect(
      detectHasOhlc([
        bar("2024-01-01", 10, { high: 11, low: 9 }),
        bar("2024-01-02", 11, { high: 12, low: 10 }),
      ]),
    ).toBe(false);
  });
});

describe("GET /api/instruments/[symbol]/candles", () => {
  it("returns 404 for unknown symbol", async () => {
    const { GET } = await import(
      "@/app/api/instruments/[symbol]/candles/route"
    );
    const req = new NextRequest(
      "http://localhost/api/instruments/NOTAREALTICKER/candles?range=1y",
    );
    const res = await GET(req, {
      params: Promise.resolve({ symbol: "NOTAREALTICKER" }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/unknown/i);
  });

  it("returns 400 for invalid range", async () => {
    const { GET } = await import(
      "@/app/api/instruments/[symbol]/candles/route"
    );
    const req = new NextRequest(
      "http://localhost/api/instruments/SPY/candles?range=2y",
    );
    const res = await GET(req, {
      params: Promise.resolve({ symbol: "SPY" }),
    });
    expect(res.status).toBe(400);
  });
});
