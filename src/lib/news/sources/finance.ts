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
