import type { Instrument } from "@/lib/types";

export const INSTRUMENTS: Instrument[] = [
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    type: "etf",
    sector: "Broad Market",
    description:
      "Tracks the S&P 500 — the default pulse check for U.S. large-cap equities and risk appetite.",
    lastPrice: 562.14,
    changePct: 0.42,
    tags: ["index", "beta", "liquidity"],
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    type: "etf",
    sector: "Technology",
    description:
      "Nasdaq-100 proxy. Sensitive to mega-cap tech, rates, and growth multiples.",
    lastPrice: 481.27,
    changePct: 0.88,
    tags: ["tech", "growth", "duration"],
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    type: "equity",
    sector: "Consumer Tech",
    description:
      "Hardware, services, and ecosystem cash flow. Watch product cycles and China demand.",
    lastPrice: 228.9,
    changePct: -0.31,
    tags: ["megacap", "services", "consumer"],
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    type: "equity",
    sector: "Semiconductors",
    description:
      "AI compute leader. Narrative swings with data-center spend, competition, and valuation.",
    lastPrice: 131.45,
    changePct: 1.74,
    tags: ["ai", "semiconductors", "growth"],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    type: "equity",
    sector: "Software",
    description:
      "Cloud + AI platform story. Azure growth and Copilot monetization drive the tape.",
    lastPrice: 428.12,
    changePct: 0.55,
    tags: ["cloud", "ai", "software"],
  },
  {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    type: "equity",
    sector: "Auto / Energy",
    description:
      "EV demand, margins, autonomy narrative, and energy storage — high-beta sentiment name.",
    lastPrice: 248.6,
    changePct: -1.12,
    tags: ["ev", "volatility", "retail"],
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil Corporation",
    type: "equity",
    sector: "Energy",
    description:
      "Integrated oil major. Moves with crude, refining cracks, and capital-return policy.",
    lastPrice: 112.3,
    changePct: 0.21,
    tags: ["oil", "value", "dividends"],
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    type: "equity",
    sector: "Financials",
    description:
      "U.S. banking bellwether. Rates, credit quality, and deal activity set the tone.",
    lastPrice: 214.75,
    changePct: 0.67,
    tags: ["banks", "rates", "credit"],
  },
  {
    symbol: "GLD",
    name: "SPDR Gold Shares",
    type: "etf",
    sector: "Commodities",
    description:
      "Gold exposure via ETF. Hedge for real rates, USD swings, and geopolitical risk.",
    lastPrice: 238.41,
    changePct: 0.19,
    tags: ["gold", "hedge", "macro"],
  },
  {
    symbol: "BTC-USD",
    name: "Bitcoin",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Flagship crypto risk asset. Correlates with liquidity, ETF flows, and risk-on tapes.",
    lastPrice: 68420,
    changePct: 2.05,
    tags: ["crypto", "liquidity", "risk-on"],
  },
  {
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    type: "fx",
    sector: "Currencies",
    description:
      "Most liquid FX pair. Reflects ECB/Fed policy differentials and global growth bets.",
    lastPrice: 1.0842,
    changePct: -0.08,
    tags: ["fx", "rates", "macro"],
  },
  {
    symbol: "^VIX",
    name: "CBOE Volatility Index",
    type: "index",
    sector: "Volatility",
    description:
      "Implied equity vol gauge. Spikes when markets demand protection.",
    lastPrice: 14.8,
    changePct: -3.2,
    tags: ["volatility", "hedging", "sentiment"],
  },
];

export function getInstrument(symbol: string): Instrument | undefined {
  const key = decodeURIComponent(symbol).toUpperCase();
  return INSTRUMENTS.find(
    (i) => i.symbol.toUpperCase() === key || i.symbol.replace("^", "") === key,
  );
}
