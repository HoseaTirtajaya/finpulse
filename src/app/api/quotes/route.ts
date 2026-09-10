import { NextRequest, NextResponse } from "next/server";
import { INSTRUMENTS } from "@/lib/instruments";
import { fetchQuotes } from "@/lib/quotes/fetch-quotes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("symbols");
  const symbols = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : INSTRUMENTS.map((i) => i.symbol);

  try {
    const quotes = await fetchQuotes(symbols);
    const liveCount = quotes.filter((q) => q.source === "live").length;
    return NextResponse.json({
      quotes,
      liveCount,
      demoCount: quotes.length - liveCount,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 },
    );
  }
}
