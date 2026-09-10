import { INSTRUMENTS } from "@/lib/instruments";

const STOP = new Set([
  "THE",
  "A",
  "AN",
  "AND",
  "OR",
  "OF",
  "TO",
  "IN",
  "ON",
  "FOR",
  "WITH",
  "AS",
  "BY",
  "AT",
  "FROM",
  "IS",
  "ARE",
  "WAS",
  "BE",
  "THIS",
  "THAT",
  "IT",
  "ITS",
  "AFTER",
  "OVER",
  "INTO",
  "ABOUT",
  "DI",
  "DAN",
  "YANG",
  "UNTUK",
  "DARI",
  "PADA",
  "DENGAN",
  "AKAN",
  "TELAH",
  "INI",
  "ITU",
]);

export function slugId(source: string, title: string, link: string): string {
  const raw = `${source}|${link || title}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `n${Math.abs(hash)}`;
}

export function extractTickers(text: string): string[] {
  const found = new Set<string>();
  const upper = text.toUpperCase();

  for (const inst of INSTRUMENTS) {
    const candidates = [
      inst.symbol.replace("^", ""),
      inst.symbol,
      ...(inst.aliases ?? []),
    ];
    for (const c of candidates) {
      const token = c.toUpperCase();
      if (token.length < 2) continue;
      const re = new RegExp(
        `\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      );
      if (re.test(text) || upper.includes(token)) {
        found.add(inst.symbol);
        break;
      }
    }
  }

  // Common crypto / fx shorthand
  if (/\bBITCOIN\b/i.test(text) || /\bBTC\b/i.test(text)) found.add("BTC-USD");
  if (/\bGOLD\b/i.test(text)) found.add("GLD");
  if (/\bIHSG\b/i.test(text)) found.add("^JKSE");

  return Array.from(found);
}

export function significantTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\u00c0-\u024f\s]/gi, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2 && !STOP.has(t.toUpperCase())),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
