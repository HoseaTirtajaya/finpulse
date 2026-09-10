import { getInstrument } from "@/lib/instruments";
import type { AiBrief, NewsItem } from "@/lib/types";

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
): AiBrief {
  const instrument = symbol ? getInstrument(symbol) : undefined;
  const focus = news.slice(0, 8);
  const joined = focus.map((n) => `${n.title}. ${n.summary}`).join(" ");

  const positives = (joined.match(/\b(rally|gain|strong|hope|bid|beat|firm|surge)\b/gi) ?? [])
    .length;
  const negatives = (
    joined.match(/\b(fall|drop|weak|risk|cut|soft|warn|pressure|loss)\b/gi) ?? []
  ).length;

  const stance = stanceFromTone(positives, negatives);
  const tickers = Array.from(
    new Set(focus.flatMap((n) => n.tickers).concat(symbol ? [symbol] : [])),
  ).slice(0, 6);

  const headline = instrument
    ? `${instrument.symbol}: desk read from ${focus.length || "available"} recent headlines`
    : `Market brief from ${focus.length} recent stories`;

  const summary = instrument
    ? [
        `Across the latest coverage tied to ${instrument.name}, the tape reads ${stance}.`,
        instrument.description,
        focus[0]
          ? `Lead story: “${focus[0].title}”.`
          : "There is limited fresh coverage for this symbol in the current feed — widen the watchlist or refresh later.",
        tickers.length
          ? `Related tickers in the conversation: ${tickers.join(", ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : [
        `The current news set leans ${stance} overall.`,
        focus[0] ? `The lead narrative is “${focus[0].title}”.` : "",
        `Themes spanning ${tickers.join(", ") || "broad markets"} are driving attention.`,
        "Treat this as a structured reading aid, not a trade recommendation.",
      ]
        .filter(Boolean)
        .join(" ");

  const bullets = focus.slice(0, 4).map((n) => `${n.source}: ${n.title}`);
  if (bullets.length === 0) {
    bullets.push("No matching headlines yet — try another symbol or category.");
  }

  const risks = [
    "Headline sentiment can reverse quickly around data prints and earnings.",
    "Demo quotes and heuristic briefs are not live brokerage research.",
    instrument?.type === "crypto"
      ? "Crypto can gap on liquidity and ETF flow surprises."
      : "Macro surprises (CPI, Fed, geopolitics) can overwrite single-name narratives.",
  ];

  const whatToWatch = instrument
    ? [
        `Price action vs. recent range for ${instrument.symbol}`,
        `Sector relative strength in ${instrument.sector}`,
        "Next scheduled catalyst (earnings, data, policy)",
      ]
    : [
        "Breadth of the advance/decline behind index moves",
        "Rates and USD reaction to the next data print",
        "Whether theme leadership (AI, energy, banks) persists into the next session",
      ];

  return {
    instrumentSymbol: instrument?.symbol,
    headline,
    stance,
    summary,
    bullets,
    risks,
    whatToWatch,
    disclaimer:
      "Not investment advice. FinPulse briefs summarize public headlines for research workflow only. Past performance and news tone do not predict future results.",
    model: "heuristic",
    generatedAt: new Date().toISOString(),
  };
}

async function llmBrief(
  news: NewsItem[],
  symbol?: string,
): Promise<AiBrief | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const instrument = symbol ? getInstrument(symbol) : undefined;
  const payload = {
    symbol: instrument?.symbol,
    name: instrument?.name,
    sector: instrument?.sector,
    headlines: news.slice(0, 10).map((n) => ({
      title: n.title,
      summary: n.summary,
      source: n.source,
      tickers: n.tickers,
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
              "You are a financial research assistant. Return JSON with keys: headline, stance (constructive|cautious|neutral|mixed), summary, bullets (string[]), risks (string[]), whatToWatch (string[]). Be concise, balanced, and never give a hard buy/sell order. Include uncertainty.",
          },
          {
            role: "user",
            content: `Draft a research brief from these headlines:\n${JSON.stringify(payload)}`,
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
      headline: parsed.headline || "AI market brief",
      stance: parsed.stance || "neutral",
      summary: parsed.summary || "",
      bullets: parsed.bullets || [],
      risks: parsed.risks || [],
      whatToWatch: parsed.whatToWatch || [],
      disclaimer:
        "Not investment advice. LLM output can be wrong or outdated. Verify with primary sources before acting.",
      model: "llm",
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function generateBrief(
  news: NewsItem[],
  symbol?: string,
): Promise<AiBrief> {
  const llm = await llmBrief(news, symbol);
  if (llm) return llm;
  return heuristicBrief(news, symbol);
}
