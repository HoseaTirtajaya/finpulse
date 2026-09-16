export type MacroEventExplainer = {
  /** Short plain-English definition */
  whatItIs: string;
  /** Typical financial / market relevance */
  whyItMatters: string;
  /** Optional “if hot/cold” cue */
  watchFor?: string;
};

type Rule = {
  /** Case-insensitive substring match against event title */
  match: RegExp;
  explain: MacroEventExplainer;
};

/**
 * Instant educational blurbs for common macro releases — no LLM, no scrape.
 * First matching rule wins (order from specific → general).
 */
const RULES: Rule[] = [
  {
    match: /\b(non[- ]?farm|nfp|payrolls?|employment change)\b/i,
    explain: {
      whatItIs:
        "Jobs report: how many people were hired or lost jobs in the latest month.",
      whyItMatters:
        "Strong hiring can support growth but may keep interest rates higher; weak jobs can push rates lower and help risk assets.",
      watchFor:
        "Hot vs forecast → USD/rates often firm. Soft vs forecast → USD softens, equities may catch a bid.",
    },
  },
  {
    match: /\b(unemployment|jobless claims|claimant count|continuing claims|initial jobless)\b/i,
    explain: {
      whatItIs:
        "Labour-market stress gauge: share of people without work or new unemployment claims.",
      whyItMatters:
        "Rising claims/unemployment can signal a cooling economy and easier policy later; falling claims support growth narratives.",
      watchFor:
        "Higher-than-expected claims → more dovish lean. Lower claims → firmer growth/rate path.",
    },
  },
  {
    match: /\b(core\s+cpi|cpi|hicp|inflation rate|consumer price)\b/i,
    explain: {
      whatItIs:
        "Inflation print: how fast consumer prices are rising (core strips food/energy).",
      whyItMatters:
        "Hot inflation keeps central banks hawkish (higher-for-longer rates). Cool inflation opens the door to cuts and softer FX.",
      watchFor:
        "Above forecast → rates/USD often up, stocks mixed. Below forecast → rates ease, risk assets can rally.",
    },
  },
  {
    match: /\b(ppi|producer price|rmpi|input price|output price)\b/i,
    explain: {
      whatItIs:
        "Producer prices: inflation at the factory/wholesale level before it hits consumers.",
      whyItMatters:
        "Rising PPI can feed into later CPI and rate expectations; soft PPI eases inflation worries.",
    },
  },
  {
    match: /\b(gdp|gross domestic)\b/i,
    explain: {
      whatItIs: "Growth scorecard: how fast the whole economy expanded or shrank.",
      whyItMatters:
        "Strong GDP supports earnings and currencies but can delay rate cuts; weak GDP raises recession / easing odds.",
    },
  },
  {
    match: /\b(fomc|fed interest rate|federal funds|rate decision|refinancing rate|mpc vote|boe interest|boj interest|ecb.*(rate|decision)|snb|bcb interest|cash rate)\b/i,
    explain: {
      whatItIs:
        "Central-bank policy decision: whether rates are hiked, cut, or held.",
      whyItMatters:
        "This is one of the biggest drivers of FX, bonds, and equities. Hawkish holds/hikes firm the currency; cuts usually soften it and support risk assets.",
      watchFor:
        "Watch the statement and press conference — guidance often moves markets more than the rate itself.",
    },
  },
  {
    match: /\b(fomc|monetary policy|press conference|economic projections|mpc meeting|policy statement)\b/i,
    explain: {
      whatItIs:
        "Policy communication: how officials explain the outlook for rates and growth.",
      whyItMatters:
        "Tone (hawkish vs dovish) reshapes rate paths, bond yields, and FX even when the policy rate is unchanged.",
    },
  },
  {
    match: /\b(retail sales|retail control)\b/i,
    explain: {
      whatItIs: "Consumer spending pulse: how much households are buying.",
      whyItMatters:
        "Strong spending supports growth and stocks; weak spending raises slowdown fears and can help bonds.",
    },
  },
  {
    match: /\b(pmi|ism|manufacturing|empire state|philadelphia fed|zew|ifo|business confidence|consumer (sentiment|confidence)|uom consumer)\b/i,
    explain: {
      whatItIs:
        "Survey of businesses or consumers about activity and outlook (not hard spending data).",
      whyItMatters:
        "Above 50 / rising prints support risk-on; sharp drops warn of cooling demand and softer rates.",
    },
  },
  {
    match: /\b(housing starts|building permits|pending home|new housing|cmhc|home sales)\b/i,
    explain: {
      whatItIs: "Housing activity: new construction, permits, or home-sale demand.",
      whyItMatters:
        "Housing is rate-sensitive. Soft data often follows higher mortgage rates; strong housing can keep growth firmer.",
    },
  },
  {
    match: /\b(trade balance|exports|imports|current account|tic net)\b/i,
    explain: {
      whatItIs:
        "External accounts: trade surplus/deficit or capital flows with other countries.",
      whyItMatters:
        "Surprises can move FX, especially for export-driven currencies (JPY, EUR, AUD, CAD).",
    },
  },
  {
    match: /\b(industrial production|capacity utilization|factory)\b/i,
    explain: {
      whatItIs: "Factory and industrial output — the goods-producing side of the economy.",
      whyItMatters:
        "Strong production supports cyclicals and commodities; weak production hints at slowing demand.",
    },
  },
  {
    match: /\b(crude|oil stocks|eia|baker hughes|rig count)\b/i,
    explain: {
      whatItIs: "Energy supply inventory or drilling activity.",
      whyItMatters:
        "Large builds can weigh on oil prices; draws support prices — feeds into inflation and energy equities.",
    },
  },
  {
    match: /\b(auction|tips|bond auction|treasury)\b/i,
    explain: {
      whatItIs: "Government debt sale: how much yield investors demand to buy bonds.",
      whyItMatters:
        "Weak auctions can lift yields and pressure stocks; strong demand can calm rates markets.",
    },
  },
  {
    match: /\b(speaks?|speech|hearing|lagarde|powell|trump speaks)\b/i,
    explain: {
      whatItIs:
        "Speech or hearing from a policymaker or political figure — not a scheduled data print.",
      whyItMatters:
        "Words can move FX and rates if they change expectations for policy, trade, or regulation. Often volatile and short-lived.",
    },
  },
  {
    match: /\b(cftc|non-commercial|positioning)\b/i,
    explain: {
      whatItIs:
        "Futures positioning report: how speculative traders are long or short a market.",
      whyItMatters:
        "Extreme positioning can flag crowded trades that unwind quickly — useful context, rarely a standalone catalyst.",
    },
  },
  {
    match: /\b(wage|earnings|average weekly|labour cost|unit labour)\b/i,
    explain: {
      whatItIs: "Pay growth: how fast wages or labour costs are rising.",
      whyItMatters:
        "Hot wages keep inflation sticky and rates higher; soft wages support easing bets.",
    },
  },
];

const FALLBACK: MacroEventExplainer = {
  whatItIs:
    "Scheduled economic release or policy event that can change growth, inflation, or rate expectations.",
  whyItMatters:
    "Markets mainly care about surprise vs the forecast: bigger surprises usually mean bigger moves in FX, bonds, and equities.",
  watchFor:
    "Compare actual to forecast when published. High-impact labels tend to move prices fastest.",
};

/**
 * Explain a calendar event title for retail readers.
 * Uses pattern matching — works offline without AI.
 */
export function explainMacroEvent(
  title: string,
  extras?: { sector?: string | null; country?: string | null },
): MacroEventExplainer {
  const t = title.trim();
  for (const rule of RULES) {
    if (rule.match.test(t)) return rule.explain;
  }
  if (extras?.sector) {
    const sector = extras.sector.toLowerCase();
    if (sector.includes("price") || sector.includes("inflation")) {
      return {
        whatItIs: `Price/inflation-related release (${extras.sector}).`,
        whyItMatters:
          "Inflation surprises reshape rate expectations and FX — usually more than soft activity data.",
      };
    }
    if (sector.includes("employment") || sector.includes("labour") || sector.includes("labor")) {
      return {
        whatItIs: `Labour-market release (${extras.sector}).`,
        whyItMatters:
          "Jobs data feeds the “growth vs inflation” debate and often moves the currency and rates.",
      };
    }
  }
  const country = extras?.country ? ` (${extras.country})` : "";
  return {
    whatItIs: `${FALLBACK.whatItIs}${country}`,
    whyItMatters: FALLBACK.whyItMatters,
    watchFor: FALLBACK.watchFor,
  };
}
