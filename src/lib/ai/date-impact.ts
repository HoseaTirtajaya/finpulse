import type { MacroEvent } from "@/lib/news/query-news";
import type { Candle, Quote } from "@/lib/types";

export const DATE_IMPACT_DISCLAIMER =
  "Not financial advice and not a prediction. FinPulse date-impact notes summarize public calendar events and recent price context for education and research only. Outcomes can differ sharply from any lean. Verify primary sources and your own risk tolerance before deciding.";

export type DateImpactLean =
  | "risk_on"
  | "risk_off"
  | "mixed"
  | "unclear";

export type DateImpactConfidence = "low" | "medium" | "high";

export type DateImpact = {
  id: string;
  eventDate: string;
  generatedAt: string;
  marketLean: DateImpactLean;
  confidence: DateImpactConfidence;
  summary: string;
  scenarios: string[];
  trends: string[];
  risks: string[];
  contextEventIds: string[];
  model: "gemini" | "openai";
  disclaimer: string;
};

export type BasketPriceContext = {
  symbol: string;
  quote: Quote | null;
  recentCloses: { date: string; close: number }[];
};

type LlmJson = {
  marketLean?: string;
  confidence?: string;
  summary?: string;
  scenarios?: unknown;
  trends?: unknown;
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

function normalizeLean(value: string | undefined): DateImpactLean | null {
  const v = (value ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (
    v === "risk_on" ||
    v === "risk_off" ||
    v === "mixed" ||
    v === "unclear"
  ) {
    return v;
  }
  if (v === "bullish" || v === "constructive" || v === "riskon") return "risk_on";
  if (v === "bearish" || v === "cautious" || v === "riskoff") return "risk_off";
  if (v === "neutral") return "mixed";
  return null;
}

function normalizeConfidence(
  value: string | undefined,
): DateImpactConfidence | null {
  const v = (value ?? "").toLowerCase().trim();
  if (v === "low" || v === "medium" || v === "high") return v;
  return null;
}

export function buildBasketContext(
  symbol: string,
  quote: Quote | null | undefined,
  candles: Candle[],
): BasketPriceContext {
  return {
    symbol,
    quote: quote ?? null,
    recentCloses: candles.slice(-10).map((c) => ({
      date: c.date,
      close: c.close,
    })),
  };
}

function systemPrompt(): string {
  return `You are FinPulse, a careful research assistant for retail investors.
Return ONLY valid JSON with these keys:
- marketLean: risk_on | risk_off | mixed | unclear
- confidence: low | medium | high
- summary: string (2–4 sentences on how this day's macro events could lean major markets — educational, not a trade call)
- scenarios: string[] (exactly 3 items starting with "Risk-on:", "Base:", and "Risk-off:")
- trends: string[] (3–5 short points on possible up/down/sideways pressure for equities, FX, rates, or crypto given the events)
- risks: string[] (3–5 concrete ways the read can be wrong)

Rules:
- Educational research only. Never give a hard buy/sell/hold or target price.
- Prefer "if X prints hot/cold, then Y is more plausible" over certainty.
- If the event list is thin, say so and keep confidence low / lean unclear.
- Do not invent forecast or actual numbers not in the payload.
- marketLean is a research lean for major markets that day, not advice to trade.`;
}

function buildPayload(
  eventDate: string,
  events: MacroEvent[],
  basket: BasketPriceContext[],
) {
  return {
    audience: "retail_investor_research",
    eventDate,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      country: e.country,
      impact: e.impact,
      eventAt: e.eventAt,
      forecast: e.forecast,
      previous: e.previous,
      actual: e.actual,
    })),
    marketBasket: basket.map((b) => ({
      symbol: b.symbol,
      quote: b.quote
        ? {
            price: b.quote.price,
            changePct: b.quote.changePct,
            asOf: b.quote.asOf,
          }
        : null,
      recentCloses: b.recentCloses,
    })),
  };
}

function validateParsed(
  parsed: LlmJson,
  eventDate: string,
  eventIds: string[],
  model: DateImpact["model"],
): DateImpact | null {
  const marketLean = normalizeLean(parsed.marketLean);
  const confidence = normalizeConfidence(parsed.confidence);
  const summary =
    typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!marketLean || !confidence || summary.length < 20) return null;

  const scenarios = asStringList(parsed.scenarios);
  const trends = asStringList(parsed.trends);
  const risks = asStringList(parsed.risks);
  if (scenarios.length === 0 || trends.length === 0 || risks.length === 0) {
    return null;
  }

  return {
    id: `date-impact-${eventDate}-${Date.now()}`,
    eventDate,
    generatedAt: new Date().toISOString(),
    marketLean,
    confidence,
    summary,
    scenarios,
    trends,
    risks,
    contextEventIds: eventIds,
    model,
    disclaimer: DATE_IMPACT_DISCLAIMER,
  };
}

async function geminiImpact(
  eventDate: string,
  events: MacroEvent[],
  basket: BasketPriceContext[],
): Promise<DateImpact | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const payload = buildPayload(eventDate, events, basket);
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
                text: `${systemPrompt()}\n\nDraft the date-impact note from this payload:\n${JSON.stringify(payload)}`,
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
    const parsed = JSON.parse(content) as LlmJson;
    return validateParsed(parsed, eventDate, eventIds, "gemini");
  } catch {
    return null;
  }
}

async function openaiImpact(
  eventDate: string,
  events: MacroEvent[],
  basket: BasketPriceContext[],
): Promise<DateImpact | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const payload = buildPayload(eventDate, events, basket);
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
            content: `Draft the date-impact note from this payload:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as LlmJson;
    return validateParsed(parsed, eventDate, eventIds, "openai");
  } catch {
    return null;
  }
}

export const DATE_IMPACT_BASKET = ["SPY", "QQQ", "EURUSD", "BTC-USD"] as const;

export async function generateDateImpact(input: {
  eventDate: string;
  events: MacroEvent[];
  basket: BasketPriceContext[];
}): Promise<DateImpact> {
  const preferred = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  let impact: DateImpact | null = null;

  if (preferred === "openai") {
    impact = await openaiImpact(
      input.eventDate,
      input.events,
      input.basket,
    );
  }
  if (!impact && (preferred === "gemini" || preferred === "openai")) {
    impact = await geminiImpact(input.eventDate, input.events, input.basket);
  }
  if (!impact && preferred !== "openai") {
    impact = await openaiImpact(
      input.eventDate,
      input.events,
      input.basket,
    );
  }

  if (!impact) {
    throw new Error("LLM date impact failed or returned malformed JSON");
  }
  return impact;
}
