import { getInstrument } from "@/lib/instruments";
import type { AiBrief, NewsItem, NewsScope } from "@/lib/types";
import { countTone } from "@/lib/sentiment";

export type AiProviderId = "heuristic" | "gemini" | "openai" | "anthropic";

function stanceFromTone(
  positives: number,
  negatives: number,
): AiBrief["stance"] {
  if (positives > negatives + 1) return "constructive";
  if (negatives > positives + 1) return "cautious";
  if (positives > 0 && negatives > 0) return "mixed";
  return "neutral";
}

function heuristicBrief(
  news: NewsItem[],
  symbol?: string,
  scope?: NewsScope,
): AiBrief {
  const instrument = symbol ? getInstrument(symbol) : undefined;
  const focus = news.slice(0, 8);
  let positives = 0;
  let negatives = 0;
  for (const n of focus) {
    const t = countTone(`${n.title} ${n.summary}`, n.language);
    positives += t.positive;
    negatives += t.negative;
  }
  const stance = stanceFromTone(positives, negatives);
  const citedHeadlines = focus.map((n) => n.title);
  const bullets = focus.slice(0, 4).map((n) => `${n.source}: ${n.title}`);
  if (bullets.length === 0) {
    bullets.push("No matching headlines yet — try another filter or refresh.");
  }

  const headline = instrument
    ? `${instrument.symbol}: desk read from ${focus.length || "available"} recent headlines`
    : scope === "trending"
      ? `Trending brief from ${focus.length} clustered stories`
      : scope === "general"
        ? `General news brief from ${focus.length} stories`
        : `Market brief from ${focus.length} recent stories`;

  const summary = instrument
    ? [
        `Across the latest coverage tied to ${instrument.name}, the tape reads ${stance}.`,
        instrument.description,
        focus[0] ? `Lead story: “${focus[0].title}”.` : "Limited fresh coverage.",
      ]
        .filter(Boolean)
        .join(" ")
    : [
        `The current ${scope ?? "news"} set leans ${stance} overall.`,
        focus[0] ? `The lead narrative is “${focus[0].title}”.` : "",
        "Treat this as a structured reading aid, not advice.",
      ]
        .filter(Boolean)
        .join(" ");

  return {
    instrumentSymbol: instrument?.symbol,
    scope,
    headline,
    stance,
    summary,
    bullets,
    risks: [
      "Headline sentiment can reverse quickly.",
      "Briefs summarize public headlines only — verify primary sources.",
      instrument?.type === "crypto"
        ? "Crypto can gap on liquidity surprises."
        : "Macro surprises can overwrite narratives.",
    ],
    whatToWatch: instrument
      ? [
          `Price action vs. recent range for ${instrument.symbol}`,
          `Sector relative strength in ${instrument.sector}`,
          "Next scheduled catalyst (earnings, data, policy)",
        ]
      : [
          "Whether the lead story persists across more outlets",
          "Secondary angles the first wave of coverage missed",
          "Official statements or data that could confirm/deny the narrative",
        ],
    citedHeadlines,
    disclaimer:
      "Not investment advice. FinPulse briefs summarize public headlines for research workflow only.",
    model: "heuristic",
    generatedAt: new Date().toISOString(),
  };
}

async function geminiBrief(
  news: NewsItem[],
  symbol?: string,
  scope?: NewsScope,
): Promise<AiBrief | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const instrument = symbol ? getInstrument(symbol) : undefined;
  const payload = {
    scope,
    symbol: instrument?.symbol,
    name: instrument?.name,
    headlines: news.slice(0, 10).map((n) => ({
      title: n.title,
      summary: n.summary,
      source: n.source,
    })),
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are a research assistant. Return ONLY JSON with keys: headline, stance (constructive|cautious|neutral|mixed), summary, bullets (string[]), risks (string[]), whatToWatch (string[]), citedHeadlines (string[] of titles you used). Never give a hard buy/sell. Draft a brief from:\n${JSON.stringify(payload)}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<AiBrief>;
    return {
      instrumentSymbol: instrument?.symbol,
      scope,
      headline: parsed.headline || "AI news brief",
      stance: parsed.stance || "neutral",
      summary: parsed.summary || "",
      bullets: parsed.bullets || [],
      risks: parsed.risks || [],
      whatToWatch: parsed.whatToWatch || [],
      citedHeadlines:
        parsed.citedHeadlines ||
        news.slice(0, 5).map((n) => n.title),
      disclaimer:
        "Not investment advice. LLM output can be wrong or outdated. Verify primary sources.",
      model: "gemini",
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function openaiBrief(
  news: NewsItem[],
  symbol?: string,
  scope?: NewsScope,
): Promise<AiBrief | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const instrument = symbol ? getInstrument(symbol) : undefined;
  const payload = {
    scope,
    symbol: instrument?.symbol,
    name: instrument?.name,
    headlines: news.slice(0, 10).map((n) => ({
      title: n.title,
      summary: n.summary,
      source: n.source,
    })),
  };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant. Return JSON with keys: headline, stance (constructive|cautious|neutral|mixed), summary, bullets, risks, whatToWatch, citedHeadlines. Never give a hard buy/sell.",
          },
          {
            role: "user",
            content: `Draft a research brief:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<AiBrief>;
    return {
      instrumentSymbol: instrument?.symbol,
      scope,
      headline: parsed.headline || "AI news brief",
      stance: parsed.stance || "neutral",
      summary: parsed.summary || "",
      bullets: parsed.bullets || [],
      risks: parsed.risks || [],
      whatToWatch: parsed.whatToWatch || [],
      citedHeadlines:
        parsed.citedHeadlines || news.slice(0, 5).map((n) => n.title),
      disclaimer:
        "Not investment advice. LLM output can be wrong or outdated. Verify primary sources.",
      model: "openai",
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function generateBrief(
  news: NewsItem[],
  symbol?: string,
  scope?: NewsScope,
): Promise<AiBrief> {
  const preferred = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  if (preferred === "openai") {
    const o = await openaiBrief(news, symbol, scope);
    if (o) return o;
  }
  if (preferred === "gemini" || preferred === "openai") {
    const g = await geminiBrief(news, symbol, scope);
    if (g) return g;
  }
  if (preferred === "openai") {
    /* already tried */
  } else {
    const o = await openaiBrief(news, symbol, scope);
    if (o) return o;
  }

  return heuristicBrief(news, symbol, scope);
}
