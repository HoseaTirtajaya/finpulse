import type { GeneralCategory } from "@/lib/types";
import type { FeedSource } from "@/lib/news/sources/finance";

/** General (non-finance) RSS — probed at implement time; drop dead feeds. */
export const GENERAL_SOURCES: FeedSource[] = [
  {
    id: "bbc-world",
    name: "BBC News",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
    category: "world",
    language: "en",
    market: "global",
  },
  {
    id: "bbc-tech",
    name: "BBC Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    category: "tech",
    language: "en",
    market: "global",
  },
  {
    id: "guardian-world",
    name: "The Guardian World",
    url: "https://www.theguardian.com/world/rss",
    category: "world",
    language: "en",
    market: "global",
  },
  {
    id: "guardian-tech",
    name: "The Guardian Technology",
    url: "https://www.theguardian.com/uk/technology/rss",
    category: "tech",
    language: "en",
    market: "global",
  },
  {
    id: "npr-news",
    name: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml",
    category: "politics",
    language: "en",
    market: "US",
  },
  {
    id: "cnn-id",
    name: "CNN Indonesia",
    url: "https://www.cnnindonesia.com/nasional/rss",
    category: "politics",
    language: "id",
    market: "ID",
  },
  {
    id: "detik-news",
    name: "Detik News",
    url: "https://news.detik.com/berita/rss",
    category: "world",
    language: "id",
    market: "ID",
  },
  {
    id: "antara-terkini",
    name: "Antara Terkini",
    url: "https://www.antaranews.com/rss/terkini.xml",
    category: "world",
    language: "id",
    market: "ID",
  },
  {
    id: "sindonews-nasional",
    name: "Sindo Nasional",
    url: "https://nasional.sindonews.com/rss",
    category: "politics",
    language: "id",
    market: "ID",
  },
];

const GENERAL_CATEGORY_HINTS: Record<
  Exclude<GeneralCategory, "all">,
  RegExp
> = {
  tech: /\b(tech|ai|software|apple|google|microsoft|chip|startup|gadget|digital)\b/i,
  politics:
    /\b(election|president|congress|parliament|minister|politik|pemilu|dpr|pemerintah)\b/i,
  sports: /\b(sport|football|soccer|nba|tennis|olympics|liga|bola|pertandingan)\b/i,
  culture:
    /\b(film|music|celebrity|entertainment|culture|budaya|hiburan|artis)\b/i,
  world: /\b(war|climate|disaster|united nations|global|internasional|dunia)\b/i,
};

export function inferGeneralCategory(
  title: string,
  summary: string,
  fallback: string,
): string {
  const text = `${title} ${summary}`;
  for (const key of [
    "tech",
    "politics",
    "sports",
    "culture",
    "world",
  ] as const) {
    if (GENERAL_CATEGORY_HINTS[key].test(text)) return key;
  }
  return fallback;
}
