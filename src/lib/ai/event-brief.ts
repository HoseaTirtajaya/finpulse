import type { MacroEvent } from "@/lib/news/query-news";

export const EVENT_BRIEF_DISCLAIMER =
  "Not financial advice. This brief explains what the release typically means for markets using public calendar fields only — it is educational research, not a prediction or trade call.";

export type EventBrief = {
  id: string;
  eventId: string;
  generatedAt: string;
  summary: string;
  keyPoints: string[];
  marketNotes: string[];
  model: "gemini" | "openai";
  disclaimer: string;
};

type LlmJson = {
  summary?: string;
  keyPoints?: unknown;
  marketNotes?: unknown;
};

function asStringList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
  }
  return out.length > 0 ? out : fallback;
}

function systemPrompt(): string {
  return `You are FinPulse, a patient teacher for people new to finance.
Write for a curious beginner — avoid trader slang (no hawkish/dovish, risk-on/off, FX, equities, basis points unless you immediately define them in plain words).
Return ONLY valid JSON with these keys:
- summary: string (2–3 sentences: what this release is, in everyday language, and why everyday investors might notice price moves)
- keyPoints: string[] (3–5 bullets: what number to look at, how it compares to “expected”, what a surprise usually means — use words like stocks, currencies, borrowing costs)
- marketNotes: string[] (3–5 bullets: “if the number is hotter/colder than expected, then …” — never a trade recommendation)

Rules:
- Educational only. No buy/sell/hold or target prices.
- Prefer “prices of everyday goods”, “borrowing costs”, “the US dollar”, “stock prices” over jargon.
- Ground claims in the event title, country/currency, impact, forecast/previous/actual, sector/type when provided.
- If numbers are missing, say so and keep notes general.
- Do not invent actual prints that are not in the payload.`;
}

function buildPayload(event: MacroEvent) {
  return {
    audience: "retail_investor_research",
    event: {
      id: event.id,
      title: event.title,
      country: event.country,
      impact: event.impact,
      eventAt: event.eventAt,
      forecast: event.forecast,
      previous: event.previous,
      actual: event.actual,
      sector: event.sector,
      eventType: event.eventType,
      sourceUrl: event.sourceUrl,
    },
  };
}

function validateParsed(
  parsed: LlmJson,
  eventId: string,
  model: EventBrief["model"],
): EventBrief | null {
  const summary =
    typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (summary.length < 20) return null;
  const keyPoints = asStringList(parsed.keyPoints);
  const marketNotes = asStringList(parsed.marketNotes);
  if (keyPoints.length === 0 || marketNotes.length === 0) return null;
  return {
    id: `event-brief-${eventId}`,
    eventId,
    generatedAt: new Date().toISOString(),
    summary,
    keyPoints,
    marketNotes,
    model,
    disclaimer: EVENT_BRIEF_DISCLAIMER,
  };
}

async function geminiBrief(event: MacroEvent): Promise<EventBrief | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
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
                text: `${systemPrompt()}\n\nDraft the event brief from this payload:\n${JSON.stringify(buildPayload(event))}`,
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
    return validateParsed(JSON.parse(content) as LlmJson, event.id, "gemini");
  } catch {
    return null;
  }
}

async function openaiBrief(event: MacroEvent): Promise<EventBrief | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
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
            content: `Draft the event brief from this payload:\n${JSON.stringify(buildPayload(event))}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return validateParsed(JSON.parse(content) as LlmJson, event.id, "openai");
  } catch {
    return null;
  }
}

export async function generateEventBrief(
  event: MacroEvent,
): Promise<EventBrief> {
  const preferred = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  let brief: EventBrief | null = null;

  if (preferred === "openai") brief = await openaiBrief(event);
  if (!brief && (preferred === "gemini" || preferred === "openai")) {
    brief = await geminiBrief(event);
  }
  if (!brief && preferred !== "openai") brief = await openaiBrief(event);

  if (!brief) {
    throw new Error("LLM event brief failed or returned malformed JSON");
  }
  return brief;
}
