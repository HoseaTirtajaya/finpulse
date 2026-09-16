import { NextRequest, NextResponse } from "next/server";
import { getInstrument } from "@/lib/instruments";
import {
  isCandleRange,
  loadCandlesForSymbol,
  type CandleRange,
} from "@/lib/market/load-candles";

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

/** Daily candles for an instrument (DB-first, live fallback). */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { symbol: raw } = await context.params;
    const instrument = getInstrument(decodeURIComponent(raw).trim());
    if (!instrument) {
      return NextResponse.json({ error: "Unknown instrument" }, { status: 404 });
    }

    const rangeParam = request.nextUrl.searchParams.get("range") ?? "1y";
    if (!isCandleRange(rangeParam)) {
      return NextResponse.json(
        { error: "Invalid range. Use 1mo, 3mo, 1y, or 5y." },
        { status: 400 },
      );
    }
    const range: CandleRange = rangeParam;

    const result = await loadCandlesForSymbol(instrument.symbol, range);
    return NextResponse.json({
      candles: result.candles,
      hasOhlc: result.hasOhlc,
      range: result.range,
      source: result.source,
    });
  } catch (err) {
    console.error("candles GET failed", err);
    return NextResponse.json(
      { error: "Could not load candles" },
      { status: 500 },
    );
  }
}
