import { createHash } from "crypto";
import { getInstrument } from "@/lib/instruments";
import type { AiBrief, Instrument, NewsItem, NewsScope, Quote } from "@/lib/types";
import { countTone } from "@/lib/sentiment";

export type AiProviderId = "heuristic" | "gemini" | "openai" | "anthropic";

const DISCLAIMER =
  "Not investment advice and not a prediction. FinPulse briefs summarize public headlines for education and research only. Outcomes can differ sharply from any scenario. Leverage / margin can wipe out capital quickly — this is not a recommendation to use leverage. Verify filings, prices, and your own risk tolerance before deciding.";

/** LLMs sometimes return objects ({title, source}) instead of plain strings. */
function asStringList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const title =
        typeof rec.title === "string"
          ? rec.title
          : typeof rec.headline === "string"
            ? rec.headline
            : typeof rec.text === "string"
              ? rec.text
              : null;
      const source = typeof rec.source === "string" ? rec.source : null;
      if (title && source) {
        out.push(`${source}: ${title}`);
      } else if (title) {
        out.push(title);
      }
    }
  }
  return out.length > 0 ? out : fallback;
}

function stanceFromTone(
  positives: number,
  negatives: number,
): AiBrief["stance"] {
  if (positives > negatives + 1) return "constructive";
  if (negatives > positives + 1) return "cautious";
  if (positives > 0 && negatives > 0) return "mixed";
  return "neutral";
}

function buildPayload(
  news: NewsItem[],
  instrument: Instrument | undefined,
  scope?: NewsScope,
  quote?: Quote | null,
) {
  return {
    audience: "retail_investor_research",
    scope,
    instrument: instrument
      ? {
          symbol: instrument.symbol,
          name: instrument.name,
          type: instrument.type,
          sector: instrument.sector,
          market: instrument.market,
          currency: instrument.currency,
          description: instrument.description,
        }
      : null,
    quote: quote
      ? {
          price: quote.price,
          changePct: quote.changePct,
          currency: quote.currency,
          marketCap: quote.marketCap,
          volume24h: quote.volume24h,
          asOf: quote.asOf,
        }
      : null,
    headlines: news.slice(0, 12).map((n) => ({
      title: n.title,
      summary: n.summary,
      source: n.source,
      publishedAt: n.publishedAt,
    })),
  };
}

function instrumentSystemPrompt(): string {
  return `You are FinPulse, a careful research assistant for retail investors.
Return ONLY valid JSON with these keys:
- headline (string): one clear research takeaway
- stance: constructive | cautious | neutral | mixed
- summary (string): 2–4 sentences on what the coverage implies for someone evaluating this instrument — balanced, plain language
- bullets (string[]): 3–5 key drivers / thesis points from the headlines
- scenarios (string[]): exactly 3 items labeled starting with "Bull:", "Base:", and "Bear:" — probable paths IF someone invests or already holds, grounded in the news (no invented earnings numbers)
- timing (string[]): 3–4 items on WHEN the research case looks stronger or weaker (e.g. after data, on pullbacks, after confirmation) — frame as conditions, NEVER as "buy now" / "sell now" / guaranteed entry prices
- risks (string[]): 4–6 concrete downside / thesis-break risks for this name or sector
- whatToWatch (string[]): 3–5 near-term catalysts or signals to monitor
- investorChecks (string[]): 3–5 practical checks before acting (liquidity, position size, horizon, filings, FX if relevant)
- leverageTrading (string[]): 4–6 items on leveraged / margin exposure for THIS instrument — cover: how bull/bear scenarios amplify with leverage; liquidation / margin-call risk; overnight / gap risk; funding or interest costs if relevant; when leverage is usually a poor fit given the news; safer alternatives (smaller cash size). NEVER recommend a leverage multiple, broker, or "go long/short with X×". Default tone is cautionary.
- citedHeadlines (string[]): titles you actually used

Rules:
- Educational research only. Never give a hard buy/sell/hold recommendation or target price.
- Prefer "if X holds, then Y is more plausible" over certainty.
- If headlines are thin or unrelated, say so and keep scenarios cautious.
- Do not invent facts not supported by the provided headlines or instrument description.
- Treat leverage as optional high-risk context for readers who already know about margin — not an invitation to use it.`;
}

function deskSystemPrompt(): string {
  return `You are FinPulse, a careful research assistant for a news desk.
Return ONLY valid JSON with keys: headline, stance (constructive|cautious|neutral|mixed), summary, bullets (string[]), risks (string[]), whatToWatch (string[]), scenarios (string[] optional), timing (string[] optional), investorChecks (string[] optional), leverageTrading (string[] optional), citedHeadlines (string[] of titles used).
Never give a hard buy/sell. Summarize what the tape is saying for an informed retail reader. If including leverageTrading, keep it cautionary and never recommend a leverage multiple.`;
}

function heuristicBrief(
  news: NewsItem[],
  symbol?: string,
  scope?: NewsScope,
  quote?: Quote | null,
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

  const priceBit =
    quote?.price != null
      ? ` Last marked near ${quote.price}${quote.changePct != null ? ` (${quote.changePct >= 0 ? "+" : ""}${quote.changePct.toFixed(2)}%)` : ""}.`
      : "";

  if (instrument) {
    return {
      instrumentSymbol: instrument.symbol,
      scope,
      headline: `${instrument.symbol}: retail research read (${stance})`,
      stance,
      summary: [
        `Coverage tied to ${instrument.name} currently leans ${stance}.`,
        instrument.description,
        focus[0]
          ? `Lead story: “${focus[0].title}”.`
          : "Fresh name-specific coverage is thin — treat any path as highly uncertain.",
        priceBit.trim(),
        "Use the scenarios below as a checklist of what could unfold, not a forecast.",
      ]
        .filter(Boolean)
        .join(" "),
      bullets,
      scenarios: [
        `Bull: Supportive headlines persist and ${instrument.sector} sentiment stays firm — the constructive tape extends and drawdowns get bought.`,
        `Base: News stays mixed; price chops while you wait for clearer confirmation from filings, earnings, or policy.`,
        `Bear: Negative coverage or sector stress dominates — thesis weakens and capital preservation matters more than chasing rebounds.`,
      ],
      timing: [
        "Case for patience: wait until a catalyst in “What to watch” resolves instead of reacting to a single headline.",
        "Case for engagement: only after your own checks (size, horizon, liquidity) and when coverage confirms rather than contradicts your thesis.",
        "Avoid FOMO entries solely because stance flipped constructive in one brief.",
        quote
          ? "Cross-check the latest quote vs. your planned risk (invalidation level) before sizing."
          : "Get a live quote and define invalidation before sizing any idea.",
      ],
      risks: [
        "Headline sentiment can reverse within hours.",
        "This brief uses public news only — missing filings or local-language nuance can change the story.",
        instrument.type === "crypto"
          ? "Crypto can gap on liquidity, leverage flushes, or exchange shocks."
          : instrument.market === "ID"
            ? "IDR, policy, and SOE/governance headlines can move IDX names quickly."
            : "Macro surprises (rates, growth, geopolitics) can overwrite the stock-specific narrative.",
        "Liquidity and spreads may be worse than you expect around news events.",
        "Concentration risk: a single-name position can underperform even if the sector is fine.",
      ],
      whatToWatch: [
        `Price action vs. recent range for ${instrument.symbol}`,
        `Relative strength within ${instrument.sector}`,
        "Next catalyst: earnings, guidance, policy, or major product/credit news",
        "Whether follow-on outlets confirm the lead story",
      ],
      investorChecks: [
        "Confirm position size is small enough that a bear scenario is tolerable.",
        "Write down your time horizon and what would make you exit (thesis break).",
        "Verify the latest financials / filings yourself — do not rely on headlines alone.",
        instrument.currency !== "USD"
          ? `Account for ${instrument.currency} FX moves if your home currency differs.`
          : "Check fees, taxes, and whether you are using cash vs. leverage.",
        "Ask whether you are reacting to narrative or to a repeatable process.",
      ],
      leverageTrading: [
        "Amplification: the same Bull/Base/Bear paths move P&L faster with margin — gains and losses both scale.",
        "Liquidation risk: a sharp adverse move can close the position before the thesis has time to play out.",
        instrument.type === "crypto"
          ? "Crypto + leverage: gaps, cascading liquidations, and exchange outages can wipe leveraged books quickly."
          : instrument.type === "fx"
            ? "FX leverage: overnight funding and sudden macro prints can force exits far from your intended level."
            : "Equity margin: overnight gaps (earnings, policy, holidays) can skip past stops.",
        "Cost drag: interest / funding fees eat returns if the Base case is sideways chop.",
        "Usually a poor fit: when coverage is thin, mixed, or catalyst-heavy — prefer smaller cash size over borrowed size.",
        "This section is educational only — FinPulse never recommends a leverage multiple or margin trade.",
      ],
      citedHeadlines,
      disclaimer: DISCLAIMER,
      model: "heuristic",
      generatedAt: new Date().toISOString(),
    };
  }

  const headline =
    scope === "trending"
      ? `Trending brief from ${focus.length} clustered stories`
      : scope === "general"
        ? `General news brief from ${focus.length} stories`
        : `Market brief from ${focus.length} recent stories`;

  return {
    scope,
    headline,
    stance,
    summary: [
      `The current ${scope ?? "news"} set leans ${stance} overall.`,
      focus[0] ? `The lead narrative is “${focus[0].title}”.` : "",
      "Treat this as a structured reading aid for research, not advice.",
    ]
      .filter(Boolean)
      .join(" "),
    bullets,
    risks: [
      "Headline sentiment can reverse quickly.",
      "Briefs summarize public headlines only — verify primary sources.",
      "Macro surprises can overwrite narratives.",
    ],
    whatToWatch: [
      "Whether the lead story persists across more outlets",
      "Secondary angles the first wave of coverage missed",
      "Official statements or data that could confirm/deny the narrative",
    ],
    scenarios: [
      "Bull: Lead narrative broadens across outlets and risk appetite holds.",
      "Base: Mixed follow-through; markets digest without a clean one-way move.",
      "Bear: Story fades or flips negative and risk assets de-risk.",
    ],
    timing: [
      "Wait for confirmation across multiple sources before changing a plan.",
      "Use quiet periods after a news burst to reassess, not to chase.",
    ],
    investorChecks: [
      "Separate portfolio decisions from a single news cycle.",
      "Re-read primary sources linked in the feed before acting.",
    ],
    leverageTrading: [
      "Leverage turns a news-driven swing into a faster win or wipeout — size as if the Bear path hits immediately.",
      "Avoid raising leverage because a desk brief looks constructive.",
    ],
    citedHeadlines,
    disclaimer: DISCLAIMER,
    model: "heuristic",
    generatedAt: new Date().toISOString(),
  };
}

function briefFromParsed(
  parsed: Partial<AiBrief>,
  news: NewsItem[],
  instrument: Instrument | undefined,
  scope: NewsScope | undefined,
  model: AiBrief["model"],
  fallback: AiBrief,
): AiBrief {
  const titleFallback = news.slice(0, 5).map((n) => n.title);
  return {
    instrumentSymbol: instrument?.symbol,
    scope,
    headline: parsed.headline || fallback.headline,
    stance: parsed.stance || fallback.stance,
    summary: parsed.summary || fallback.summary,
    bullets: asStringList(parsed.bullets, fallback.bullets),
    risks: asStringList(parsed.risks, fallback.risks),
    whatToWatch: asStringList(parsed.whatToWatch, fallback.whatToWatch),
    scenarios: asStringList(parsed.scenarios, fallback.scenarios),
    timing: asStringList(parsed.timing, fallback.timing),
    investorChecks: asStringList(
      parsed.investorChecks,
      fallback.investorChecks,
    ),
    leverageTrading: asStringList(
      parsed.leverageTrading,
      fallback.leverageTrading,
    ),
    citedHeadlines: asStringList(parsed.citedHeadlines, titleFallback),
    disclaimer: DISCLAIMER,
    model,
    generatedAt: new Date().toISOString(),
  };
}

async function geminiBrief(
  news: NewsItem[],
  symbol?: string,
  scope?: NewsScope,
  quote?: Quote | null,
): Promise<AiBrief | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const instrument = symbol ? getInstrument(symbol) : undefined;
  const payload = buildPayload(news, instrument, scope, quote);
  const system = instrument ? instrumentSystemPrompt() : deskSystemPrompt();
  const fallback = heuristicBrief(news, symbol, scope, quote);

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
                text: `${system}\n\nDraft the brief from this payload:\n${JSON.stringify(payload)}`,
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
    const parsed = JSON.parse(content) as Partial<AiBrief>;
    return briefFromParsed(parsed, news, instrument, scope, "gemini", fallback);
  } catch {
    return null;
  }
}

async function openaiBrief(
  news: NewsItem[],
  symbol?: string,
  scope?: NewsScope,
  quote?: Quote | null,
): Promise<AiBrief | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const instrument = symbol ? getInstrument(symbol) : undefined;
  const payload = buildPayload(news, instrument, scope, quote);
  const system = instrument ? instrumentSystemPrompt() : deskSystemPrompt();
  const fallback = heuristicBrief(news, symbol, scope, quote);

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
          { role: "system", content: system },
          {
            role: "user",
            content: `Draft the retail research brief from this payload:\n${JSON.stringify(payload)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as Partial<AiBrief>;
    return briefFromParsed(parsed, news, instrument, scope, "openai", fallback);
  } catch {
    return null;
  }
}

function headlineHash(news: NewsItem[]): string {
  const raw = news
    .slice(0, 12)
    .map((n) => n.id || n.url || n.title)
    .join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

async function loadCachedBrief(
  symbol: string | undefined,
  hash: string,
): Promise<AiBrief | null> {
  try {
    const { hasDatabase, getDb } = await import("@/lib/db");
    if (!hasDatabase()) return null;
    const { aiBriefs } = await import("@/lib/db/schema");
    const { and, desc, eq, isNull } = await import("drizzle-orm");
    const db = getDb();
    const conditions = [eq(aiBriefs.headlineHash, hash)];
    if (symbol) conditions.push(eq(aiBriefs.symbol, symbol));
    else conditions.push(isNull(aiBriefs.symbol));
    const [row] = await db
      .select()
      .from(aiBriefs)
      .where(and(...conditions))
      .orderBy(desc(aiBriefs.createdAt))
      .limit(1);
    if (!row) return null;
    return row.brief as AiBrief;
  } catch {
    return null;
  }
}

async function saveCachedBrief(
  symbol: string | undefined,
  scope: NewsScope | undefined,
  hash: string,
  brief: AiBrief,
): Promise<void> {
  try {
    const { hasDatabase, getDb } = await import("@/lib/db");
    if (!hasDatabase()) return;
    const { aiBriefs } = await import("@/lib/db/schema");
    const db = getDb();
    await db
      .insert(aiBriefs)
      .values({
        id: `brief-${hash}-${symbol ?? "desk"}`,
        symbol: symbol ?? null,
        scope: scope ?? null,
        headlineHash: hash,
        brief,
        model: brief.model,
      })
      .onConflictDoNothing();
  } catch {
    // cache miss path is fine
  }
}

export async function generateBrief(
  news: NewsItem[],
  symbol?: string,
  scope?: NewsScope,
  quote?: Quote | null,
): Promise<AiBrief> {
  const hash = headlineHash(news);
  const cached = await loadCachedBrief(symbol, hash);
  if (cached) return cached;

  const preferred = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  let brief: AiBrief | null = null;

  if (preferred === "openai") {
    brief = await openaiBrief(news, symbol, scope, quote);
  }
  if (!brief && (preferred === "gemini" || preferred === "openai")) {
    brief = await geminiBrief(news, symbol, scope, quote);
  }
  if (!brief && preferred !== "openai") {
    brief = await openaiBrief(news, symbol, scope, quote);
  }
  if (!brief) {
    brief = heuristicBrief(news, symbol, scope, quote);
  }

  // Only persist LLM briefs (heuristic is cheap to recompute).
  if (brief.model !== "heuristic") {
    void saveCachedBrief(symbol, scope, hash, brief);
  }
  return brief;
}
