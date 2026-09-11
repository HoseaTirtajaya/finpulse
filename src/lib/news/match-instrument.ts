import type { NewsItem } from "@/lib/types";

/** Generic tokens that appear in many unrelated headlines. */
const GENERIC_NAME_TOKENS = new Set([
  "BANK",
  "GROUP",
  "HOLDING",
  "HOLDINGS",
  "CORP",
  "CORPORATION",
  "INC",
  "LTD",
  "LIMITED",
  "COMPANY",
  "INTERNATIONAL",
  "INDONESIA",
  "INDONESIAN",
  "CHINA",
  "JAPAN",
  "ASIA",
  "EUROPE",
  "GLOBAL",
  "TECH",
  "TECHNOLOGY",
  "MOTOR",
  "MOTORS",
  "ENERGY",
  "FINANCIAL",
  "FINANCE",
  "SERVICES",
  "TRUST",
  "INDEX",
  "SHARES",
]);

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-token match (avoids BRI ⊂ BRICS, Bank ⊂ banking noise via generics). */
export function hasWordToken(haystack: string, needle: string): boolean {
  const token = needle.trim();
  if (token.length < 2) return false;
  // Digits/ticker symbols like 0700.HK, 7203.T, BBRI, ^N225
  const pattern =
    /^[\d.A-Z^]+$/i.test(token) && token.length <= 12
      ? `(?<![A-Z0-9])${escapeRe(token)}(?![A-Z0-9])`
      : `\\b${escapeRe(token)}\\b`;
  return new RegExp(pattern, "i").test(haystack);
}

/**
 * Match a headline to an instrument via tickers, symbol, distinctive name
 * parts, or aliases — never generic words like "Bank" / "Indonesia".
 */
export function matchesInstrument(
  item: NewsItem,
  symbol: string,
  name: string,
  aliases?: string[],
): boolean {
  const blob = `${item.title} ${item.summary}`;
  const sym = symbol.toUpperCase();

  // Do not trust stored tickers alone — ingest may have tagged false
  // positives (e.g. BRI ⊂ BRICS). Require text corroboration below.
  const key = sym.replace("-USD", "").replace("^", "");
  if (key.length >= 3 && hasWordToken(blob, key)) return true;
  if (hasWordToken(blob, symbol)) return true;

  // Full official name is strongest
  if (name.length > 8 && hasWordToken(blob, name)) return true;

  // Distinctive name tokens only (skip Bank / Indonesia / Group / …)
  const nameParts = name
    .split(/[\s,/&.]+/)
    .map((p) => p.trim())
    .filter(
      (p) =>
        p.length > 3 &&
        !GENERIC_NAME_TOKENS.has(p.toUpperCase()) &&
        !/^(PT|TBK|THE|AND|OF)$/i.test(p),
    );
  for (const part of nameParts) {
    if (hasWordToken(blob, part)) return true;
  }

  for (const a of aliases ?? []) {
    if (a.length < 3) continue;
    if (GENERIC_NAME_TOKENS.has(a.toUpperCase())) continue;
    if (hasWordToken(blob, a)) return true;
  }

  return false;
}
