import type { FinanceCategory, FeedMarket } from "@/lib/types";

export type FeedSource = {
  id: string;
  name: string;
  url: string;
  category: Exclude<FinanceCategory, "all"> | string;
  language: "en" | "id";
  market?: FeedMarket;
};

/** Public finance RSS — Indonesian feeds verified 200 from this machine. */
export const FINANCE_SOURCES: FeedSource[] = [
  {
    id: "yahoo-finance",
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    category: "markets",
    language: "en",
    market: "US",
  },
  {
    id: "cnbc-markets",
    name: "CNBC Markets",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258",
    category: "markets",
    language: "en",
    market: "US",
  },
  {
    id: "cnbc-economy",
    name: "CNBC Economy",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910261",
    category: "macro",
    language: "en",
    market: "US",
  },
  {
    id: "marketwatch-top",
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    category: "equities",
    language: "en",
    market: "US",
  },
  {
    id: "cnbc-id-market",
    name: "CNBC Indonesia Market",
    url: "https://www.cnbcindonesia.com/market/rss",
    category: "markets",
    language: "id",
    market: "ID",
  },
  {
    id: "cnbc-id-news",
    name: "CNBC Indonesia News",
    url: "https://www.cnbcindonesia.com/news/rss",
    category: "macro",
    language: "id",
    market: "ID",
  },
  {
    id: "kontan",
    name: "Kontan",
    url: "https://www.kontan.co.id/rss",
    category: "markets",
    language: "id",
    market: "ID",
  },
  {
    id: "detik-finance",
    name: "Detik Finance",
    url: "https://finance.detik.com/rss",
    category: "markets",
    language: "id",
    market: "ID",
  },
  {
    id: "liputan6-bisnis",
    name: "Liputan6 Bisnis",
    url: "https://feed.liputan6.com/rss/bisnis",
    category: "equities",
    language: "id",
    market: "ID",
  },
  {
    id: "antara-ekonomi",
    name: "Antara Ekonomi",
    url: "https://www.antaranews.com/rss/ekonomi.xml",
    category: "macro",
    language: "id",
    market: "ID",
  },
  {
    id: "sindonews-ekbis",
    name: "Sindo Ekbis",
    url: "https://ekbis.sindonews.com/rss",
    category: "markets",
    language: "id",
    market: "ID",
  },
  // —— Europe equities / markets ——
  {
    id: "nasdaq-europe",
    name: "Nasdaq Europe",
    url: "https://www.nasdaq.com/feed/rssoutbound?category=Europe",
    category: "equities",
    language: "en",
    market: "EU",
  },
  {
    id: "ft-markets",
    name: "FT Markets",
    url: "https://www.ft.com/markets?format=rss",
    category: "markets",
    language: "en",
    market: "EU",
  },
  {
    id: "bbc-business",
    name: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    category: "markets",
    language: "en",
    market: "EU",
  },
  {
    id: "france24-business",
    name: "France 24 Business",
    url: "https://www.france24.com/en/business/rss",
    category: "markets",
    language: "en",
    market: "EU",
  },
  {
    id: "investing-stock",
    name: "Investing.com Stocks",
    url: "https://www.investing.com/rss/news_25.rss",
    category: "equities",
    language: "en",
    market: "EU",
  },
  // —— Asia equities / markets ——
  {
    id: "nasdaq-asia",
    name: "Nasdaq Asia",
    url: "https://www.nasdaq.com/feed/rssoutbound?category=Asia",
    category: "equities",
    language: "en",
    market: "Asia",
  },
  {
    id: "nikkei-asia",
    name: "Nikkei Asia",
    url: "https://asia.nikkei.com/rss/feed/nar",
    category: "markets",
    language: "en",
    market: "Asia",
  },
  {
    id: "scmp-business",
    name: "SCMP Business",
    url: "https://www.scmp.com/rss/91/feed",
    category: "markets",
    language: "en",
    market: "Asia",
  },
  {
    id: "cna-business",
    name: "CNA Business",
    url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=business",
    category: "markets",
    language: "en",
    market: "Asia",
  },
  {
    id: "straits-times-biz",
    name: "Straits Times Business",
    url: "https://www.straitstimes.com/news/business/rss.xml",
    category: "markets",
    language: "en",
    market: "Asia",
  },
  {
    id: "investing-asia",
    name: "Investing.com Asia",
    url: "https://www.investing.com/rss/news_301.rss",
    category: "equities",
    language: "en",
    market: "Asia",
  },
  // —— Crypto ——
  {
    id: "coindesk",
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    category: "crypto",
    language: "en",
    market: "global",
  },
  {
    id: "cointelegraph",
    name: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
    category: "crypto",
    language: "en",
    market: "global",
  },
  {
    id: "the-block",
    name: "The Block",
    url: "https://www.theblock.co/rss.xml",
    category: "crypto",
    language: "en",
    market: "global",
  },
  {
    id: "decrypt",
    name: "Decrypt",
    url: "https://decrypt.co/feed",
    category: "crypto",
    language: "en",
    market: "global",
  },
  {
    id: "bitcoin-magazine",
    name: "Bitcoin Magazine",
    url: "https://bitcoinmagazine.com/.rss/full/",
    category: "crypto",
    language: "en",
    market: "global",
  },
  {
    id: "nasdaq-crypto",
    name: "Nasdaq Crypto",
    url: "https://www.nasdaq.com/feed/rssoutbound?category=Cryptocurrencies",
    category: "crypto",
    language: "en",
    market: "global",
  },
  {
    id: "investing-crypto",
    name: "Investing.com Crypto",
    url: "https://www.investing.com/rss/news_285.rss",
    category: "crypto",
    language: "en",
    market: "global",
  },
  // —— Global markets (cross-region) ——
  {
    id: "wsj-markets",
    name: "WSJ Markets",
    url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    category: "markets",
    language: "en",
    market: "global",
  },
  {
    id: "cnbc-world-biz",
    name: "CNBC World Business",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362",
    category: "markets",
    language: "en",
    market: "global",
  },
];

const FINANCE_CATEGORY_HINTS: Record<
  Exclude<FinanceCategory, "all">,
  RegExp
> = {
  crypto:
    /\b(bitcoin|crypto|ethereum|solana|ripple|cardano|dogecoin|avalanche|polkadot|chainlink|polygon|litecoin|uniswap|arbitrum|optimism|toncoin|shiba|btc|eth|sol|xrp|bnb|ada|doge|avax|dot|link|matic|trx|ton|shib|ltc|atom|uni|near|apt|icp|fil|arb|sui|digital asset|blockchain|kripto|defi|web3)\b/i,
  macro:
    /\b(fed|inflation|cpi|gdp|treasury|rates|economy|jobs|unemployment|ecb|bi rate|inflasi|suku bunga|rupiah)\b/i,
  equities:
    /\b(stock|shares|earnings|ipo|nasdaq|dow|s&p|equity|buyback|saham|ihsg|lq45)\b/i,
  markets: /\b(market|rally|selloff|futures|wall street|trading|bursa|ihsg)\b/i,
};

export function inferFinanceCategory(
  title: string,
  summary: string,
  fallback: string,
): string {
  const text = `${title} ${summary}`;
  for (const key of ["crypto", "macro", "equities", "markets"] as const) {
    if (FINANCE_CATEGORY_HINTS[key].test(text)) return key;
  }
  return fallback;
}
