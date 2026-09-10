import { NextRequest, NextResponse } from "next/server";
import { INSTRUMENTS } from "@/lib/instruments";
import { getCachedQuotes } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("symbols");
  const symbols = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : INSTRUMENTS.map((i) => i.symbol);

  try {
    const quotes = await getCachedQuotes(symbols.join(","));
    return NextResponse.json({
      quotes,
      liveCount: quotes.length,
      missing: symbols.filter(
        (s) => !quotes.some((q) => q.symbol.toUpperCase() === s.toUpperCase()),
      ),
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
