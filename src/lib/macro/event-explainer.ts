export type MacroEventExplainer = {
  /** Newbie-friendly title instead of jargon like "CPI y/y" */
  simpleTitle: string;
  /** Short plain-English definition */
  whatItIs: string;
  /** Typical financial / market relevance in everyday words */
  whyItMatters: string;
  /** Optional “if higher/lower than expected” cue */
  watchFor?: string;
};

type Rule = {
  match: RegExp;
  explain: MacroEventExplainer;
};

/**
 * Instant educational blurbs for common macro releases — no LLM, no scrape.
 * Written for beginners (avoid trader slang).
 */
const RULES: Rule[] = [
  {
    match: /\b(non[- ]?farm|nfp|payrolls?|employment change)\b/i,
    explain: {
      simpleTitle: "Jobs report (how many people got hired)",
      whatItIs:
        "A monthly count of how many people found or lost jobs.",
      whyItMatters:
        "Lots of new jobs can mean the economy is strong — but it can also keep borrowing costs high. Weak jobs can mean lower borrowing costs later, which some investors like.",
      watchFor:
        "If the number is much higher than expected, the US dollar often gets stronger. If it is much lower, stock prices sometimes rise because people expect cheaper borrowing.",
    },
  },
  {
    match: /\b(unemployment|jobless claims|claimant count|continuing claims|initial jobless)\b/i,
    explain: {
      simpleTitle: "How many people are out of work (or filing for help)",
      whatItIs:
        "Shows how hard it is to find a job, or how many people just filed for unemployment help.",
      whyItMatters:
        "Rising numbers can mean the economy is cooling. Falling numbers usually mean the job market still looks healthy.",
      watchFor:
        "Higher than expected can hint that interest rates may come down later. Lower than expected often supports a stronger currency.",
    },
  },
  {
    match: /\b(core\s+cpi|cpi|hicp|inflation rate|consumer price)\b/i,
    explain: {
      simpleTitle: "Inflation — how fast everyday prices are rising",
      whatItIs:
        "Measures whether groceries, rent, and other daily costs are getting more expensive. “Core” usually ignores food and energy, which jump around a lot.",
      whyItMatters:
        "If prices rise too fast, central banks often keep interest rates high (borrowing stays expensive). If inflation cools, rates may fall later — which can help stock prices.",
      watchFor:
        "Higher than expected → borrowing costs and the currency often strengthen. Lower than expected → stocks may rally and the currency can weaken.",
    },
  },
  {
    match: /\b(ppi|producer price|rmpi|input price|output price)\b/i,
    explain: {
      simpleTitle: "Factory/wholesale prices (inflation before the store shelf)",
      whatItIs:
        "Tracks prices companies pay (or charge) before goods reach shoppers.",
      whyItMatters:
        "Rising factory prices can show up later in consumer inflation. Soft numbers can ease worries about future price hikes.",
      watchFor:
        "Think of it as an early warning for the inflation report shoppers feel.",
    },
  },
  {
    match: /\b(gdp|gross domestic)\b/i,
    explain: {
      simpleTitle: "Economy scorecard — is the country growing?",
      whatItIs:
        "The big picture measure of whether the whole economy got bigger or smaller.",
      whyItMatters:
        "Strong growth is usually good for businesses and jobs, but it can also keep interest rates higher. Weak growth raises worries about a slowdown.",
    },
  },
  {
    match: /\b(fomc|fed interest rate|federal funds|rate decision|refinancing rate|mpc vote|boe interest|boj interest|ecb.*(rate|decision)|snb|bcb interest|cash rate)\b/i,
    explain: {
      simpleTitle: "Interest-rate decision (borrowing costs for the whole economy)",
      whatItIs:
        "The country’s main bank decides whether to raise, cut, or hold the key interest rate.",
      whyItMatters:
        "This is one of the biggest money-moving events. Higher rates often strengthen the currency and can pressure stock prices. Rate cuts usually do the opposite.",
      watchFor:
        "The speech after the decision often moves markets more than the number itself.",
    },
  },
  {
    match: /\b(fomc|monetary policy|press conference|economic projections|mpc meeting|policy statement)\b/i,
    explain: {
      simpleTitle: "Officials explain what they might do next with rates",
      whatItIs:
        "Not always a rate change — often a statement or press Q&A about the economic outlook.",
      whyItMatters:
        "If officials sound worried about inflation, markets expect rates to stay high. If they sound relaxed, people may expect cuts sooner.",
    },
  },
  {
    match: /\b(retail sales|retail control)\b/i,
    explain: {
      simpleTitle: "How much people are spending in shops",
      whatItIs:
        "Tracks what households are buying — a real-world pulse of consumer demand.",
      whyItMatters:
        "Strong spending supports company sales. Weak spending can signal people are tightening their belts.",
    },
  },
  {
    match: /\b(pmi|ism|manufacturing|empire state|philadelphia fed|zew|ifo|business confidence|consumer (sentiment|confidence)|uom consumer)\b/i,
    explain: {
      simpleTitle: "Mood check — surveys of businesses or shoppers",
      whatItIs:
        "A survey asking companies or consumers how things feel (busy, slow, optimistic). It is an opinion snapshot, not final sales numbers.",
      whyItMatters:
        "Improving mood can support stock prices. A sharp drop can mean people expect weaker demand ahead.",
      watchFor:
        "For many of these surveys, a reading above 50 often means “expanding”; below 50 often means “shrinking.”",
    },
  },
  {
    match: /\b(housing starts|building permits|pending home|new housing|cmhc|home sales)\b/i,
    explain: {
      simpleTitle: "Housing activity (building and buying homes)",
      whatItIs:
        "Tracks new home building, building permits, or home-sale demand.",
      whyItMatters:
        "Homes are expensive to finance. When interest rates are high, housing often slows. Strong housing can mean the economy still has momentum.",
    },
  },
  {
    match: /\b(trade balance|exports|imports|current account|tic net)\b/i,
    explain: {
      simpleTitle: "Trade and money flows with other countries",
      whatItIs:
        "Shows whether a country sells more abroad than it buys (or the opposite), and sometimes how investment money moves across borders.",
      whyItMatters:
        "Surprises can nudge a currency’s value — especially for countries that rely heavily on exports.",
    },
  },
  {
    match: /\b(industrial production|capacity utilization|factory)\b/i,
    explain: {
      simpleTitle: "Factory output — how busy manufacturers are",
      whatItIs:
        "Measures how much factories and industry are producing.",
      whyItMatters:
        "Busy factories often support growth and commodity demand. Quiet factories can hint at slower times ahead.",
    },
  },
  {
    match: /\b(crude|oil stocks|eia|baker hughes|rig count)\b/i,
    explain: {
      simpleTitle: "Oil supply (inventories or drilling)",
      whatItIs:
        "Tracks how much oil is in storage, or how many drilling rigs are active.",
      whyItMatters:
        "More oil in storage can push oil prices down. Less oil in storage can push prices up — and that can affect fuel costs and inflation.",
    },
  },
  {
    match: /\b(auction|tips|bond auction|treasury)\b/i,
    explain: {
      simpleTitle: "Government bond sale (borrowing from investors)",
      whatItIs:
        "The government sells bonds to raise money. Investors say what return they want to lend.",
      whyItMatters:
        "If demand is weak, borrowing costs can rise and stock prices can feel pressure. Strong demand usually calms markets.",
    },
  },
  {
    match: /\b(speaks?|speech|hearing|lagarde|powell|trump speaks)\b/i,
    explain: {
      simpleTitle: "A speech or hearing (words, not a data number)",
      whatItIs:
        "A politician or central-bank official is talking — there may be no new statistic that day.",
      whyItMatters:
        "Markets can jump if the speaker hints at new rules, trade policy, or future interest-rate moves. Moves are often quick and short-lived.",
    },
  },
  {
    match: /\b(cftc|non-commercial|positioning)\b/i,
    explain: {
      simpleTitle: "How traders are already betting (positioning report)",
      whatItIs:
        "A report showing whether big traders are mostly betting prices will go up or down.",
      whyItMatters:
        "Useful background. If almost everyone is on one side, a surprise can cause a sharp snap-back. Rarely a headline by itself.",
    },
  },
  {
    match: /\b(wage|earnings|average weekly|labour cost|unit labour)\b/i,
    explain: {
      simpleTitle: "Pay growth — are wages rising fast?",
      whatItIs:
        "Tracks how quickly paychecks or labour costs are going up.",
      whyItMatters:
        "Fast wage growth can keep inflation sticky, so interest rates may stay high. Soft wage growth can support the idea of rate cuts later.",
    },
  },
];

const FALLBACK: MacroEventExplainer = {
  simpleTitle: "Scheduled economy update",
  whatItIs:
    "A planned report or policy event that can change how people see growth, prices, or interest rates.",
  whyItMatters:
    "Investors mostly react when the number is surprisingly different from what was expected — not just from the title alone.",
  watchFor:
    "When the result comes out, compare it to what was expected. Bigger surprises usually mean bigger, faster price moves.",
};

const CURRENCY_PLAIN: Record<string, string> = {
  USD: "United States",
  EUR: "Euro area",
  GBP: "United Kingdom",
  JPY: "Japan",
  CAD: "Canada",
  AUD: "Australia",
  NZD: "New Zealand",
  CHF: "Switzerland",
  CNY: "China",
  IDR: "Indonesia",
  BRL: "Brazil",
  KRW: "South Korea",
  HKD: "Hong Kong",
  MYR: "Malaysia",
  TRY: "Turkey",
  SAR: "Saudi Arabia",
  PHP: "Philippines",
  RON: "Romania",
  NOK: "Norway",
  ILS: "Israel",
  US: "United States",
  EU: "Euro area",
  GB: "United Kingdom",
  JP: "Japan",
  CN: "China",
  ID: "Indonesia",
};

/** Plain country/region label for currency or country codes. */
export function plainRegionLabel(code: string | null | undefined): string {
  if (!code) return "";
  const key = code.trim().toUpperCase();
  return CURRENCY_PLAIN[key] ?? code;
}

/** Newbie-friendly impact badge text. */
export function plainImpactLabel(impact: string): string {
  const i = impact.toLowerCase();
  if (i === "high") return "Usually big market moves";
  if (i === "medium") return "Worth watching";
  if (i === "holiday") return "Market holiday";
  return "Smaller expected impact";
}

/**
 * Explain a calendar event title for beginners.
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
        simpleTitle: "A price / inflation update",
        whatItIs: `This release is about prices (${extras.sector}).`,
        whyItMatters:
          "Inflation surprises often change expectations for interest rates and currency values.",
      };
    }
    if (
      sector.includes("employment") ||
      sector.includes("labour") ||
      sector.includes("labor")
    ) {
      return {
        simpleTitle: "A jobs-market update",
        whatItIs: `This release is about the job market (${extras.sector}).`,
        whyItMatters:
          "Jobs data helps people guess whether the economy is heating up or cooling down — and what that means for interest rates.",
      };
    }
  }
  const region = plainRegionLabel(extras?.country);
  return {
    simpleTitle: region
      ? `Economy update · ${region}`
      : FALLBACK.simpleTitle,
    whatItIs: FALLBACK.whatItIs,
    whyItMatters: FALLBACK.whyItMatters,
    watchFor: FALLBACK.watchFor,
  };
}
