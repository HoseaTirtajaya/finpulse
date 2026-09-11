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

  for (const inst of INSTRUMENTS) {
    const candidates = [
      inst.symbol.replace("^", ""),
      inst.symbol,
      ...(inst.aliases ?? []),
    ];
    for (const c of candidates) {
      const token = c.trim();
      if (token.length < 3) continue;
      // Skip ultra-generic aliases that flood unrelated stories
      if (/^(BANK|ASIA|GROUP|HOLDINGS?|INC|LTD)$/i.test(token)) continue;
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Word / ticker boundary only — never bare substring (BRI ⊂ BRICS)
      const re = new RegExp(
        /^[\d.A-Z^]+$/i.test(token) && token.length <= 12
          ? `(?<![A-Z0-9])${escaped}(?![A-Z0-9])`
          : `\\b${escaped}\\b`,
        "i",
      );
      if (re.test(text)) {
        found.add(inst.symbol);
        break;
      }
    }
  }

  // Common crypto / fx shorthand (word-boundary only)
  if (/\bBITCOIN\b/i.test(text) || /\bBTC\b/i.test(text)) found.add("BTC-USD");
  if (/\bETHEREUM\b/i.test(text) || /\bETHER\b/i.test(text) || /\bETH\b/i.test(text))
    found.add("ETH-USD");
  if (/\bSOLANA\b/i.test(text) || /\bSOL\b/i.test(text)) found.add("SOL-USD");
  if (/\bRIPPLE\b/i.test(text) || /\bXRP\b/i.test(text)) found.add("XRP-USD");
  if (/\bBINANCE COIN\b/i.test(text) || /\bBNB\b/i.test(text)) found.add("BNB-USD");
  if (/\bCARDANO\b/i.test(text) || /\bADA\b/i.test(text)) found.add("ADA-USD");
  if (/\bDOGECOIN\b/i.test(text) || /\bDOGE\b/i.test(text)) found.add("DOGE-USD");
  if (/\bAVALANCHE\b/i.test(text) || /\bAVAX\b/i.test(text)) found.add("AVAX-USD");
  if (/\bPOLKADOT\b/i.test(text) || /\bDOT\b/i.test(text)) found.add("DOT-USD");
  if (/\bCHAINLINK\b/i.test(text) || /\bLINK\b/i.test(text)) found.add("LINK-USD");
  if (/\bPOLYGON\b/i.test(text) || /\bMATIC\b/i.test(text)) found.add("POL-USD");
  if (/\bTRON\b/i.test(text) || /\bTRX\b/i.test(text)) found.add("TRX-USD");
  if (/\bTONCOIN\b/i.test(text) || /\bTON\b/i.test(text)) found.add("TON-USD");
  if (/\bSHIBA INU\b/i.test(text) || /\bSHIB\b/i.test(text)) found.add("SHIB-USD");
  if (/\bLITECOIN\b/i.test(text) || /\bLTC\b/i.test(text)) found.add("LTC-USD");
  if (/\bBITCOIN CASH\b/i.test(text) || /\bBCH\b/i.test(text)) found.add("BCH-USD");
  if (/\bCOSMOS\b/i.test(text)) found.add("ATOM-USD");
  if (/\bUNISWAP\b/i.test(text)) found.add("UNI-USD");
  if (/\bNEAR PROTOCOL\b/i.test(text)) found.add("NEAR-USD");
  if (/\bAPTOS\b/i.test(text)) found.add("APT-USD");
  if (/\bINTERNET COMPUTER\b/i.test(text) || /\bICP\b/i.test(text))
    found.add("ICP-USD");
  if (/\bFILECOIN\b/i.test(text)) found.add("FIL-USD");
  if (/\bARBITRUM\b/i.test(text) || /\bARB\b/i.test(text)) found.add("ARB-USD");
  if (/\bOPTIMISM\b/i.test(text)) found.add("OP-USD");
  if (/\bSUI\b/i.test(text) || /\bSUI NETWORK\b/i.test(text)) found.add("SUI-USD");
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
