import type { Instrument } from "@/lib/types";

export const INSTRUMENTS: Instrument[] = [
  {
    symbol: "SPY",
    name: "SPDR S&P 500 ETF",
    type: "etf",
    sector: "Broad Market",
    description:
      "Tracks the S&P 500 — the default pulse check for U.S. large-cap equities and risk appetite.",
    market: "US",
    currency: "USD",
    yahooSymbol: "SPY",
    tags: ["index", "beta", "liquidity"],
  },
  {
    symbol: "QQQ",
    name: "Invesco QQQ Trust",
    type: "etf",
    sector: "Technology",
    description:
      "Nasdaq-100 proxy. Sensitive to mega-cap tech, rates, and growth multiples.",
    market: "US",
    currency: "USD",
    yahooSymbol: "QQQ",
    tags: ["tech", "growth", "duration"],
  },
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    type: "equity",
    sector: "Consumer Tech",
    description:
      "Hardware, services, and ecosystem cash flow. Watch product cycles and China demand.",
    market: "US",
    currency: "USD",
    yahooSymbol: "AAPL",
    tags: ["megacap", "services", "consumer"],
    aliases: ["Apple"],
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    type: "equity",
    sector: "Semiconductors",
    description:
      "AI compute leader. Narrative swings with data-center spend, competition, and valuation.",
    market: "US",
    currency: "USD",
    yahooSymbol: "NVDA",
    tags: ["ai", "semiconductors", "growth"],
    aliases: ["Nvidia", "NVIDIA"],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    type: "equity",
    sector: "Software",
    description:
      "Cloud + AI platform story. Azure growth and Copilot monetization drive the tape.",
    market: "US",
    currency: "USD",
    yahooSymbol: "MSFT",
    tags: ["cloud", "ai", "software"],
    aliases: ["Microsoft"],
  },
  {
    symbol: "TSLA",
    name: "Tesla, Inc.",
    type: "equity",
    sector: "Auto / Energy",
    description:
      "EV demand, margins, autonomy narrative, and energy storage — high-beta sentiment name.",
    market: "US",
    currency: "USD",
    yahooSymbol: "TSLA",
    tags: ["ev", "volatility", "retail"],
    aliases: ["Tesla"],
  },
  {
    symbol: "XOM",
    name: "Exxon Mobil Corporation",
    type: "equity",
    sector: "Energy",
    description:
      "Integrated oil major. Moves with crude, refining cracks, and capital-return policy.",
    market: "US",
    currency: "USD",
    yahooSymbol: "XOM",
    tags: ["oil", "value", "dividends"],
    aliases: ["Exxon"],
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    type: "equity",
    sector: "Financials",
    description:
      "U.S. banking bellwether. Rates, credit quality, and deal activity set the tone.",
    market: "US",
    currency: "USD",
    yahooSymbol: "JPM",
    tags: ["banks", "rates", "credit"],
    aliases: ["JPMorgan", "J.P. Morgan"],
  },
  {
    symbol: "GLD",
    name: "SPDR Gold Shares",
    type: "etf",
    sector: "Commodities",
    description:
      "Gold exposure via ETF. Hedge for real rates, USD swings, and geopolitical risk.",
    market: "US",
    currency: "USD",
    yahooSymbol: "GLD",
    tags: ["gold", "hedge", "macro"],
  },
  {
    symbol: "BTC-USD",
    name: "Bitcoin",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Flagship crypto risk asset. Correlates with liquidity, ETF flows, and risk-on tapes.",
    market: "US",
    currency: "USD",
    yahooSymbol: "BTC-USD",
    tags: ["crypto", "liquidity", "risk-on"],
    aliases: ["Bitcoin", "BTC"],
  },
  {
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    type: "fx",
    sector: "Currencies",
    description:
      "Most liquid FX pair. Reflects ECB/Fed policy differentials and global growth bets.",
    market: "US",
    currency: "USD",
    yahooSymbol: "EURUSD=X",
    tags: ["fx", "rates", "macro"],
  },
  {
    symbol: "^VIX",
    name: "CBOE Volatility Index",
    type: "index",
    sector: "Volatility",
    description:
      "Implied equity vol gauge. Spikes when markets demand protection.",
    market: "US",
    currency: "USD",
    yahooSymbol: "^VIX",
    tags: ["volatility", "hedging", "sentiment"],
    aliases: ["VIX"],
  },
  {
    symbol: "BBCA",
    name: "Bank Central Asia",
    type: "equity",
    sector: "Banks",
    description:
      "Indonesia's largest private bank by market cap. Watch NIM, digital deposits, and credit growth.",
    market: "ID",
    currency: "IDR",
    yahooSymbol: "BBCA.JK",
    tags: ["banks", "idx", "bluechip"],
    aliases: ["BCA", "Bank Central Asia"],
  },
  {
    symbol: "BBRI",
    name: "Bank Rakyat Indonesia",
    type: "equity",
    sector: "Banks",
    description:
      "Microfinance-led SOE bank. Sensitive to MSME credit quality and government policy.",
    market: "ID",
    currency: "IDR",
    yahooSymbol: "BBRI.JK",
    tags: ["banks", "idx", "soe"],
    aliases: ["BRI", "Bank Rakyat"],
  },
  {
    symbol: "BMRI",
    name: "Bank Mandiri",
    type: "equity",
    sector: "Banks",
    description:
      "Largest Indonesian bank by assets. Corporate lending and fee income drive the story.",
    market: "ID",
    currency: "IDR",
    yahooSymbol: "BMRI.JK",
    tags: ["banks", "idx", "soe"],
    aliases: ["Mandiri", "Bank Mandiri"],
  },
  {
    symbol: "TLKM",
    name: "Telkom Indonesia",
    type: "equity",
    sector: "Telecom",
    description:
      "Incumbent telco and digital infrastructure play via Telkomsel and data centers.",
    market: "ID",
    currency: "IDR",
    yahooSymbol: "TLKM.JK",
    tags: ["telecom", "idx", "soe"],
    aliases: ["Telkom", "Telkomsel"],
  },
  {
    symbol: "ASII",
    name: "Astra International",
    type: "equity",
    sector: "Conglomerate",
    description:
      "Auto, heavy equipment, and financial services conglomerate — a domestic demand proxy.",
    market: "ID",
    currency: "IDR",
    yahooSymbol: "ASII.JK",
    tags: ["auto", "idx", "conglomerate"],
    aliases: ["Astra"],
  },
  {
    symbol: "ANTM",
    name: "Aneka Tambang",
    type: "equity",
    sector: "Mining",
    description:
      "Nickel and gold miner. Moves with commodity prices and EV battery feedstock demand.",
    market: "ID",
    currency: "IDR",
    yahooSymbol: "ANTM.JK",
    tags: ["nickel", "gold", "idx"],
    aliases: ["Antam", "Aneka Tambang"],
  },
  {
    symbol: "GOTO",
    name: "GoTo Gojek Tokopedia",
    type: "equity",
    sector: "Internet",
    description:
      "Super-app / e-commerce platform. Watch path to profitability and take-rate trends.",
    market: "ID",
    currency: "IDR",
    yahooSymbol: "GOTO.JK",
    tags: ["tech", "idx", "growth"],
    aliases: ["GoTo", "Gojek", "Tokopedia"],
  },
  {
    symbol: "^JKSE",
    name: "Jakarta Composite Index (IHSG)",
    type: "index",
    sector: "Broad Market",
    description:
      "Indonesian equity market pulse. Tracks overall IDX risk appetite.",
    market: "ID",
    currency: "IDR",
    yahooSymbol: "^JKSE",
    tags: ["index", "idx", "ihsg"],
    aliases: ["IHSG", "JKSE", "Jakarta Composite"],
  },
  {
    symbol: "USDIDR",
    name: "US Dollar / Indonesian Rupiah",
    type: "fx",
    sector: "Currencies",
    description:
      "Key FX pair for Indonesian assets. Sensitive to Fed policy and BI rates.",
    market: "ID",
    currency: "IDR",
    yahooSymbol: "USDIDR=X",
    tags: ["fx", "rupiah", "macro"],
    aliases: ["Rupiah", "USD/IDR"],
  },
];

export function getInstrument(symbol: string): Instrument | undefined {
  const key = decodeURIComponent(symbol).toUpperCase();
  return INSTRUMENTS.find(
    (i) =>
      i.symbol.toUpperCase() === key ||
      i.symbol.replace("^", "") === key ||
      i.yahooSymbol.toUpperCase() === key ||
      i.aliases?.some((a) => a.toUpperCase() === key),
  );
}

export function formatPrice(
  price: number | null | undefined,
  currency: "USD" | "IDR" = "USD",
  type?: Instrument["type"],
): string {
  if (price == null || Number.isNaN(price)) return "—";
  if (type === "fx") {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  if (currency === "IDR") {
    return `Rp ${Math.round(price).toLocaleString("id-ID")}`;
  }
  return price.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatChangePct(changePct: number | null | undefined): string {
  if (changePct == null || Number.isNaN(changePct)) return "—";
  const sign = changePct >= 0 ? "+" : "";
  return `${sign}${changePct.toFixed(2)}%`;
}
