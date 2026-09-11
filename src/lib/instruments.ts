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
    market: "global",
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
    market: "global",
    currency: "USD",
    yahooSymbol: "BTC-USD",
    coingeckoId: "bitcoin",
    tags: ["crypto", "liquidity", "risk-on"],
    aliases: ["Bitcoin", "BTC"],
  },
  {
    symbol: "ETH-USD",
    name: "Ethereum",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Smart-contract platform. Sensitive to L2 activity, staking yields, and ETF flows.",
    market: "global",
    currency: "USD",
    yahooSymbol: "ETH-USD",
    coingeckoId: "ethereum",
    tags: ["crypto", "smart-contracts", "defi"],
    aliases: ["Ethereum", "Ether", "ETH"],
  },
  {
    symbol: "SOL-USD",
    name: "Solana",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "High-throughput L1. Moves with meme-coin activity, DeFi TVL, and outage risk.",
    market: "global",
    currency: "USD",
    yahooSymbol: "SOL-USD",
    coingeckoId: "solana",
    tags: ["crypto", "l1", "defi"],
    aliases: ["Solana", "SOL"],
  },
  {
    symbol: "XRP-USD",
    name: "XRP",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Payments-focused token. Sensitive to regulatory news and remittance narratives.",
    market: "global",
    currency: "USD",
    yahooSymbol: "XRP-USD",
    coingeckoId: "ripple",
    tags: ["crypto", "payments"],
    aliases: ["Ripple", "XRP"],
  },
  {
    symbol: "BNB-USD",
    name: "BNB",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Binance ecosystem token. Tracks exchange volumes and BNB Chain activity.",
    market: "global",
    currency: "USD",
    yahooSymbol: "BNB-USD",
    coingeckoId: "binancecoin",
    tags: ["crypto", "exchange"],
    aliases: ["Binance Coin", "BNB"],
  },
  {
    symbol: "ADA-USD",
    name: "Cardano",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Research-led L1. Watch governance upgrades and DeFi adoption on Cardano.",
    market: "global",
    currency: "USD",
    yahooSymbol: "ADA-USD",
    coingeckoId: "cardano",
    tags: ["crypto", "l1"],
    aliases: ["Cardano", "ADA"],
  },
  {
    symbol: "DOGE-USD",
    name: "Dogecoin",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Meme-coin bellwether. Driven by social narrative and retail risk appetite.",
    market: "global",
    currency: "USD",
    yahooSymbol: "DOGE-USD",
    coingeckoId: "dogecoin",
    tags: ["crypto", "meme"],
    aliases: ["Dogecoin", "DOGE"],
  },
  {
    symbol: "AVAX-USD",
    name: "Avalanche",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Subnet-focused L1. Sensitive to DeFi TVL and institutional chain experiments.",
    market: "global",
    currency: "USD",
    yahooSymbol: "AVAX-USD",
    coingeckoId: "avalanche-2",
    tags: ["crypto", "l1", "defi"],
    aliases: ["Avalanche", "AVAX"],
  },
  {
    symbol: "DOT-USD",
    name: "Polkadot",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Interoperability / parachain platform. Watch auctions and staking dynamics.",
    market: "global",
    currency: "USD",
    yahooSymbol: "DOT-USD",
    coingeckoId: "polkadot",
    tags: ["crypto", "interop"],
    aliases: ["Polkadot", "DOT"],
  },
  {
    symbol: "LINK-USD",
    name: "Chainlink",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Oracle network. Correlates with DeFi usage and real-world asset narratives.",
    market: "global",
    currency: "USD",
    yahooSymbol: "LINK-USD",
    coingeckoId: "chainlink",
    tags: ["crypto", "oracles", "defi"],
    aliases: ["Chainlink", "LINK"],
  },
  {
    symbol: "POL-USD",
    name: "Polygon",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Ethereum scaling / AggLayer story. Watch POL tokenomics and L2 competition.",
    market: "global",
    currency: "USD",
    yahooSymbol: "POL-USD",
    coingeckoId: "polygon-ecosystem-token",
    tags: ["crypto", "l2", "ethereum"],
    aliases: ["Polygon", "MATIC", "POL"],
  },
  {
    symbol: "TRX-USD",
    name: "TRON",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "High-throughput chain with large stablecoin settlement volumes.",
    market: "global",
    currency: "USD",
    yahooSymbol: "TRX-USD",
    coingeckoId: "tron",
    tags: ["crypto", "payments"],
    aliases: ["TRON", "Tron", "TRX"],
  },
  {
    symbol: "TON-USD",
    name: "Toncoin",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Telegram-adjacent L1. Sensitive to mini-app adoption and regulatory tone.",
    market: "global",
    currency: "USD",
    yahooSymbol: "TON-USD",
    coingeckoId: "the-open-network",
    tags: ["crypto", "l1", "telegram"],
    aliases: ["Toncoin", "TON"],
  },
  {
    symbol: "SHIB-USD",
    name: "Shiba Inu",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Large-cap meme token. Driven by retail flows and ecosystem burn narratives.",
    market: "global",
    currency: "USD",
    yahooSymbol: "SHIB-USD",
    coingeckoId: "shiba-inu",
    tags: ["crypto", "meme"],
    aliases: ["Shiba Inu", "SHIB"],
  },
  {
    symbol: "LTC-USD",
    name: "Litecoin",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Payments-oriented PoW asset. Often trades as a Bitcoin beta proxy.",
    market: "global",
    currency: "USD",
    yahooSymbol: "LTC-USD",
    coingeckoId: "litecoin",
    tags: ["crypto", "payments"],
    aliases: ["Litecoin", "LTC"],
  },
  {
    symbol: "BCH-USD",
    name: "Bitcoin Cash",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Bitcoin fork focused on larger blocks and payment throughput.",
    market: "global",
    currency: "USD",
    yahooSymbol: "BCH-USD",
    coingeckoId: "bitcoin-cash",
    tags: ["crypto", "payments"],
    aliases: ["Bitcoin Cash", "BCH"],
  },
  {
    symbol: "ATOM-USD",
    name: "Cosmos",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "IBC / app-chain hub. Watch Cosmos Hub upgrades and ecosystem TVL.",
    market: "global",
    currency: "USD",
    yahooSymbol: "ATOM-USD",
    coingeckoId: "cosmos",
    tags: ["crypto", "interop"],
    aliases: ["Cosmos"],
  },
  {
    symbol: "UNI-USD",
    name: "Uniswap",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Leading DEX governance token. Sensitive to fee-switch and DeFi volumes.",
    market: "global",
    currency: "USD",
    yahooSymbol: "UNI-USD",
    coingeckoId: "uniswap",
    tags: ["crypto", "defi", "dex"],
    aliases: ["Uniswap"],
  },
  {
    symbol: "NEAR-USD",
    name: "NEAR Protocol",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Sharded L1 with AI / consumer app narrative. Watch usage and unlocks.",
    market: "global",
    currency: "USD",
    yahooSymbol: "NEAR-USD",
    coingeckoId: "near",
    tags: ["crypto", "l1", "ai"],
    aliases: ["NEAR Protocol"],
  },
  {
    symbol: "APT-USD",
    name: "Aptos",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Move-based L1. Sensitive to ecosystem launches and unlock calendars.",
    market: "global",
    currency: "USD",
    yahooSymbol: "APT-USD",
    coingeckoId: "aptos",
    tags: ["crypto", "l1"],
    aliases: ["Aptos"],
  },
  {
    symbol: "ICP-USD",
    name: "Internet Computer",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "On-chain compute platform. Watch developer activity and AI app narratives.",
    market: "global",
    currency: "USD",
    yahooSymbol: "ICP-USD",
    coingeckoId: "internet-computer",
    tags: ["crypto", "compute"],
    aliases: ["Internet Computer", "ICP"],
  },
  {
    symbol: "FIL-USD",
    name: "Filecoin",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Decentralized storage network. Correlates with storage demand and AI data narratives.",
    market: "global",
    currency: "USD",
    yahooSymbol: "FIL-USD",
    coingeckoId: "filecoin",
    tags: ["crypto", "storage"],
    aliases: ["Filecoin"],
  },
  {
    symbol: "ARB-USD",
    name: "Arbitrum",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Ethereum L2. Moves with rollup fees, DeFi TVL, and governance unlocks.",
    market: "global",
    currency: "USD",
    yahooSymbol: "ARB-USD",
    coingeckoId: "arbitrum",
    tags: ["crypto", "l2", "ethereum"],
    aliases: ["Arbitrum", "ARB"],
  },
  {
    symbol: "OP-USD",
    name: "Optimism",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "OP Stack L2. Sensitive to Superchain adoption and airdrop / unlock dynamics.",
    market: "global",
    currency: "USD",
    yahooSymbol: "OP-USD",
    coingeckoId: "optimism",
    tags: ["crypto", "l2", "ethereum"],
    aliases: ["Optimism"],
  },
  {
    symbol: "SUI-USD",
    name: "Sui",
    type: "crypto",
    sector: "Digital Assets",
    description:
      "Move-based L1 with consumer / gaming focus. Watch ecosystem growth and unlocks.",
    market: "global",
    currency: "USD",
    yahooSymbol: "SUI-USD",
    coingeckoId: "sui",
    tags: ["crypto", "l1"],
    aliases: ["Sui Network"],
  },
  {
    symbol: "EURUSD",
    name: "Euro / US Dollar",
    type: "fx",
    sector: "Currencies",
    description:
      "Most liquid FX pair. Reflects ECB/Fed policy differentials and global growth bets.",
    market: "global",
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
    market: "global",
    currency: "USD",
    yahooSymbol: "^VIX",
    tags: ["volatility", "hedging", "sentiment"],
    aliases: ["VIX"],
  },
  {
    symbol: "ASML",
    name: "ASML Holding",
    type: "equity",
    sector: "Semiconductors",
    description:
      "EU lithography monopoly for advanced chips. Moves with foundry capex and geopolitics.",
    market: "EU",
    currency: "EUR",
    yahooSymbol: "ASML.AS",
    tags: ["semiconductors", "eu", "ai"],
    aliases: ["ASML Holding"],
  },
  {
    symbol: "SAP",
    name: "SAP SE",
    type: "equity",
    sector: "Software",
    description:
      "European enterprise software leader. Cloud transition and AI copilots drive the story.",
    market: "EU",
    currency: "EUR",
    yahooSymbol: "SAP.DE",
    tags: ["software", "eu", "cloud"],
    aliases: ["SAP SE"],
  },
  {
    symbol: "MC.PA",
    name: "LVMH",
    type: "equity",
    sector: "Luxury",
    description:
      "European luxury conglomerate. Sensitive to China demand and high-end consumer spend.",
    market: "EU",
    currency: "EUR",
    yahooSymbol: "MC.PA",
    tags: ["luxury", "eu", "consumer"],
    aliases: ["LVMH", "Moet"],
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
    aliases: ["BRI", "Bank Rakyat", "Bank Rakyat Indonesia"],
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
  // —— Asia (Japan + China, liquid Yahoo listings) ——
  {
    symbol: "7203.T",
    name: "Toyota Motor",
    type: "equity",
    sector: "Auto",
    description:
      "Japan's auto bellwether. EV transition, hybrid demand, and yen sensitivity drive the tape.",
    market: "Asia",
    currency: "JPY",
    yahooSymbol: "7203.T",
    tags: ["japan", "auto", "nikkei"],
    aliases: ["Toyota"],
  },
  {
    symbol: "6758.T",
    name: "Sony Group",
    type: "equity",
    sector: "Consumer Tech",
    description:
      "Games, sensors, and entertainment. Watch PlayStation cycle and image-sensor margins.",
    market: "Asia",
    currency: "JPY",
    yahooSymbol: "6758.T",
    tags: ["japan", "tech", "gaming"],
    aliases: ["Sony"],
  },
  {
    symbol: "9984.T",
    name: "SoftBank Group",
    type: "equity",
    sector: "Investment / Tech",
    description:
      "Vision Fund and Arm narrative. High-beta to global tech risk and AI valuations.",
    market: "Asia",
    currency: "JPY",
    yahooSymbol: "9984.T",
    tags: ["japan", "tech", "ai"],
    aliases: ["SoftBank", "Soft Bank"],
  },
  {
    symbol: "6861.T",
    name: "Keyence",
    type: "equity",
    sector: "Industrial Tech",
    description:
      "Factory automation sensors. Proxy for Japan/Asia manufacturing capex.",
    market: "Asia",
    currency: "JPY",
    yahooSymbol: "6861.T",
    tags: ["japan", "automation", "industrials"],
    aliases: ["Keyence"],
  },
  {
    symbol: "^N225",
    name: "Nikkei 225",
    type: "index",
    sector: "Broad Market",
    description:
      "Japan equity benchmark. Sensitive to BOJ policy, yen, and global risk appetite.",
    market: "Asia",
    currency: "JPY",
    yahooSymbol: "^N225",
    tags: ["japan", "index", "nikkei"],
    aliases: ["Nikkei", "Nikkei 225"],
  },
  {
    symbol: "0700.HK",
    name: "Tencent Holdings",
    type: "equity",
    sector: "Internet",
    description:
      "China internet platform — games, WeChat, fintech, and cloud. Policy and ad spend matter.",
    market: "Asia",
    currency: "HKD",
    yahooSymbol: "0700.HK",
    tags: ["china", "internet", "hongkong"],
    aliases: ["Tencent"],
  },
  {
    symbol: "9988.HK",
    name: "Alibaba Group",
    type: "equity",
    sector: "E-commerce",
    description:
      "China commerce and cloud. Watch cloud growth, competition, and regulatory tone.",
    market: "Asia",
    currency: "HKD",
    yahooSymbol: "9988.HK",
    tags: ["china", "ecommerce", "hongkong"],
    aliases: ["Alibaba", "BABA"],
  },
  {
    symbol: "3690.HK",
    name: "Meituan",
    type: "equity",
    sector: "Internet",
    description:
      "China local services / delivery. Sensitive to consumer spend and competition.",
    market: "Asia",
    currency: "HKD",
    yahooSymbol: "3690.HK",
    tags: ["china", "consumer", "hongkong"],
    aliases: ["Meituan"],
  },
  {
    symbol: "9618.HK",
    name: "JD.com",
    type: "equity",
    sector: "E-commerce",
    description:
      "China retail and logistics. Watch GMV trends and margin discipline.",
    market: "Asia",
    currency: "HKD",
    yahooSymbol: "9618.HK",
    tags: ["china", "ecommerce", "hongkong"],
    aliases: ["JD", "JD.com"],
  },
  {
    symbol: "PDD",
    name: "PDD Holdings",
    type: "equity",
    sector: "E-commerce",
    description:
      "Temu / Pinduoduo growth story. High volatility around overseas expansion and margins.",
    market: "Asia",
    currency: "USD",
    yahooSymbol: "PDD",
    tags: ["china", "ecommerce", "adr"],
    aliases: ["Pinduoduo", "Temu", "PDD Holdings"],
  },
];

export function getInstrument(symbol: string): Instrument | undefined {
  const key = decodeURIComponent(symbol).toUpperCase();
  return INSTRUMENTS.find(
    (i) =>
      i.symbol.toUpperCase() === key ||
      i.symbol.replace("^", "") === key ||
      i.yahooSymbol.toUpperCase() === key ||
      i.coingeckoId?.toUpperCase() === key ||
      i.aliases?.some((a) => a.toUpperCase() === key),
  );
}

export function getCryptoInstruments(): Instrument[] {
  return INSTRUMENTS.filter((i) => i.type === "crypto");
}

/** Map CoinGecko id → FinPulse symbol for rankings deep-links. */
export function instrumentSymbolForCoingeckoId(
  coingeckoId: string,
): string | undefined {
  return INSTRUMENTS.find((i) => i.coingeckoId === coingeckoId)?.symbol;
}

export function formatCompactUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPrice(
  price: number | null | undefined,
  currency: "USD" | "IDR" | "EUR" | "JPY" | "HKD" = "USD",
  type?: Instrument["type"],
): string {
  if (price == null || Number.isNaN(price)) return "—";
  if (type === "fx") {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  if (type === "crypto") {
    const abs = Math.abs(price);
    const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8;
    return price.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: digits,
    });
  }
  if (currency === "IDR") {
    return `Rp ${Math.round(price).toLocaleString("id-ID")}`;
  }
  if (currency === "JPY") {
    return `¥${Math.round(price).toLocaleString("ja-JP")}`;
  }
  if (currency === "HKD") {
    return price.toLocaleString(undefined, {
      style: "currency",
      currency: "HKD",
      maximumFractionDigits: 2,
    });
  }
  if (currency === "EUR") {
    return price.toLocaleString(undefined, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
    });
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
