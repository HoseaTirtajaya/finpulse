import { getInstrument } from "@/lib/instruments";
import type { MacroEvent } from "@/lib/news/query-news";
import type { Candle, Instrument, Quote } from "@/lib/types";

export const REVIEW_DISCLAIMER =
  "Not financial advice and not a prediction. FinPulse instrument reviews summarize public price data and economic calendar context for education and research only. Outcomes can differ sharply from any stance. Verify filings, prices, and your own risk tolerance before deciding.";

export type InstrumentReviewStance = "bullish" | "bearish" | "neutral";
export type InstrumentReviewConfidence = "low" | "medium" | "high";

export type InstrumentReview = {
  id: string;
  instrument: string;
  generatedAt: string;
  stance: InstrumentReviewStance;
  confidence: InstrumentReviewConfidence;
  summary: string;
  rationale: string[];
  risks: string[];
  contextEventIds: string[];
  model: "gemini" | "openai";
  disclaimer: string;
};

export type PriceContext = {
  quote: Quote | null;
  /** Recent closes for a short trend sketch (newest last). */
  recentCloses: { date: string; close: number }[];
};

type LlmReviewJson = {
  stance?: string;
  confidence?: string;
  summary?: string;
  rationale?: unknown;
  risks?: unknown;
};

function asStringList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
  }
  return out.length > 0 ? out : fallback;
}

function normalizeStance(value: string | undefined): InstrumentReviewStance | null {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "bullish" || v === "bearish" || v === "neutral") return v;
  if (v === "constructive" || v === "positive") return "bullish";
  if (v === "cautious" || v === "negative") return "bearish";
  if (v === "mixed") return "neutral";
  return null;
}

function normalizeConfidence(
  value: string | undefined,
): InstrumentReviewConfidence | null {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "low" || v === "medium" || v === "high") return v;
  return null;
}

function buildPriceSketch(candles: Candle[]): PriceContext["recentCloses"] {
  return candles.slice(-10).map((c) => ({ date: c.date, close: c.close }));
}

export function buildPriceContext(
  quote: Quote | null | undefined,
  candles: Candle[],
): PriceContext {
  return {
    quote: quote ?? null,
    recentCloses: buildPriceSketch(candles),
  };
}

function systemPrompt(): string {
  return `You are FinPulse, a careful research assistant for retail investors.
Return ONLY valid JSON with these keys:
- stance: bullish | bearish | neutral
- confidence: low | medium | high
- summary: string (2–4 sentences; balanced research read, not a trade call)
- rationale: string[] (3–5 short points grounded in the price snapshot and calendar events)
- risks: string[] (3–5 concrete downside / thesis-break risks)

Rules:
- Educational research only. Never give a hard buy/sell/hold recommendation or target price.
- Prefer "if X holds, then Y is more plausible" over certainty.
- If calendar context is thin or unrelated, say so and keep confidence low.
- Do not invent event numbers not present in the payload.
- Stance reflects research lean from price + macro context, not advice to trade.`;
}

function buildPayload(
  instrument: Instrument,
  price: PriceContext,
  events: MacroEvent[],
) {
  return {
    audience: "retail_investor_research",
    instrument: {
      symbol: instrument.symbol,
      name: instrument.name,
      type: instrument.type,
      sector: instrument.sector,
      market: instrument.market,
      currency: instrument.currency,
      description: instrument.description,
    },
    price: price.quote
      ? {
          last: price.quote.price,
          changePct: price.quote.changePct,
          currency: price.quote.currency,
          asOf: price.quote.asOf,
        }
      : null,
    recentCloses: price.recentCloses,
    upcomingEvents: events.map((e) => ({
      id: e.id,
      title: e.title,
      country: e.country,
      impact: e.impact,
      eventAt: e.eventAt,
      forecast: e.forecast,
      previous: e.previous,
      actual: e.actual,
    })),
  };
}

function validateParsed(
  parsed: LlmReviewJson,
  instrument: Instrument,
  eventIds: string[],
  model: InstrumentReview["model"],
): InstrumentReview | null {
  const stance = normalizeStance(parsed.stance);
  const confidence = normalizeConfidence(parsed.confidence);
  const summary =
    typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!stance || !confidence || summary.length < 20) return null;

  const rationale = asStringList(parsed.rationale);
  const risks = asStringList(parsed.risks);
  if (rationale.length === 0 || risks.length === 0) return null;

  const generatedAt = new Date().toISOString();
  return {
    id: `review-${instrument.symbol}-${Date.now()}`,
    instrument: instrument.symbol,
    generatedAt,
    stance,
    confidence,
    summary,
    rationale,
    risks,
    contextEventIds: eventIds,
    model,
    disclaimer: REVIEW_DISCLAIMER,
  };
}

async function geminiReview(
  instrument: Instrument,
  price: PriceContext,
  events: MacroEvent[],
): Promise<InstrumentReview | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const payload = buildPayload(instrument, price, events);
  const eventIds = events.map((e) => e.id);

  try {
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${systemPrompt()}\n\nDraft the instrument review from this payload:\n${JSON.stringify(payload)}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;
    const parsed = JSON.parse(content) as LlmReviewJson;
    return validateParsed(parsed, instrument, eventIds, "gemini");
  } catch {
    return null;
  }
}

async function openaiReview(
  instrument: Instrument,
  price: PriceContext,
  events: MacroEvent[],
): Promise<InstrumentReview | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const payload = buildPayload(instrument, price, events);
  const eventIds = events.map((e) => e.id);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt() },
          {
            role: "user",
            content: `Draft the instrument review from this payload:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as LlmReviewJson;
    return validateParsed(parsed, instrument, eventIds, "openai");
  } catch {
    return null;
  }
}

export async function generateInstrumentReview(input: {
  symbol: string;
  events: MacroEvent[];
  priceContext: PriceContext;
}): Promise<InstrumentReview> {
  const instrument = getInstrument(input.symbol);
  if (!instrument) {
    throw new Error(`Unknown instrument: ${input.symbol}`);
  }

  const preferred = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  let review: InstrumentReview | null = null;

  if (preferred === "openai") {
    review = await openaiReview(instrument, input.priceContext, input.events);
  }
  if (!review && (preferred === "gemini" || preferred === "openai")) {
    review = await geminiReview(instrument, input.priceContext, input.events);
  }
  if (!review && preferred !== "openai") {
    review = await openaiReview(instrument, input.priceContext, input.events);
  }

  if (!review) {
    throw new Error("LLM review failed or returned malformed JSON");
  }
  return review;
}
