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
  // Indonesian dictionary collision with Cardano ticker
  "ADA",
]);

/**
 * Short ticker tokens that are also everyday words.
 * Never match case-insensitively alone — need $TICKER, TICKER-USD,
 * or ALL-CAPS + crypto context. Full coin names always match normally.
 */
export const AMBIGUOUS_SHORT_TICKERS = new Set([
  "ADA", // Indonesian "Ada …"
  "SOL", // "solution" is boundary-safe; still guard title-case "Sol"
  "DOT",
  "TON",
  "LINK",
  "NEAR",
  "OP",
  "SUI",
  "UNI",
  "FIL",
  "APT",
  "ARB",
  "ONE",
  "GAS",
  "FLOW",
  "IMX",
  "MANA",
  "SAND",
  "APE",
  "ATOM",
  "TRX",
]);

const CRYPTO_CONTEXT_RE =
  /\b(crypto|cryptocurrency|bitcoin|ethereum|blockchain|kripto|defi|web3|token|altcoin|stablecoin|binance|coinbase|nft|cardano|solana|dogecoin|avalanche|polkadot|chainlink|litecoin|uniswap|arbitrum|optimism|toncoin|shiba|ripple|matic|tron|cosmos|aptos|filecoin|polygon)\b/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasCryptoContext(text: string): boolean {
  return CRYPTO_CONTEXT_RE.test(text);
}

export function hasStrongTickerForm(text: string, token: string): boolean {
  const t = escapeRe(token.trim());
  if (!t) return false;
  return (
    new RegExp(`\\$${t}\\b`, "i").test(text) ||
    new RegExp(`\\b${t}-USD\\b`, "i").test(text)
  );
}

export function hasAllCapsTicker(text: string, token: string): boolean {
  const t = escapeRe(token.trim().toUpperCase());
  if (!t) return false;
  return new RegExp(`(?<![A-Z0-9])${t}(?![A-Z0-9])`).test(text);
}

/** Safe to tag an ambiguous short ticker from this text. */
export function ambiguousTickerAllowed(text: string, token: string): boolean {
  const key = token.trim().toUpperCase().replace(/-USD$/, "");
  if (hasStrongTickerForm(text, key)) return true;
  if (hasAllCapsTicker(text, key) && hasCryptoContext(text)) return true;
  return false;
}

function ambiguousKey(token: string): string | null {
  const upper = token.trim().toUpperCase();
  const key = upper.replace(/-USD$/, "").replace(/^\^/, "");
  if (AMBIGUOUS_SHORT_TICKERS.has(key)) return key;
  return null;
}

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
      if (/^(BANK|ASIA|GROUP|HOLDINGS?|INC|LTD)$/i.test(token)) continue;

      const tickerLike = /^[\d.A-Z^]+$/i.test(token) && token.length <= 12;
      const ambKey = tickerLike ? ambiguousKey(token) : null;

      if (ambKey) {
        if (ambiguousTickerAllowed(text, ambKey)) {
          found.add(inst.symbol);
          break;
        }
        continue;
      }

      const escaped = escapeRe(token);
      const re = new RegExp(
        tickerLike
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

  // Full names + safe shorts. Ambiguous shorts go through ambiguousTickerAllowed.
  if (/\bBITCOIN\b/i.test(text) || /\bBTC\b/i.test(text)) found.add("BTC-USD");
  if (/\bETHEREUM\b/i.test(text) || /\bETHER\b/i.test(text) || /\bETH\b/i.test(text))
    found.add("ETH-USD");
  if (/\bSOLANA\b/i.test(text) || ambiguousTickerAllowed(text, "SOL"))
    found.add("SOL-USD");
  if (/\bRIPPLE\b/i.test(text) || /\bXRP\b/i.test(text)) found.add("XRP-USD");
  if (/\bBINANCE COIN\b/i.test(text) || /\bBNB\b/i.test(text))
    found.add("BNB-USD");
  if (/\bCARDANO\b/i.test(text) || ambiguousTickerAllowed(text, "ADA"))
    found.add("ADA-USD");
  if (/\bDOGECOIN\b/i.test(text) || /\bDOGE\b/i.test(text))
    found.add("DOGE-USD");
  if (/\bAVALANCHE\b/i.test(text) || /\bAVAX\b/i.test(text))
    found.add("AVAX-USD");
  if (/\bPOLKADOT\b/i.test(text) || ambiguousTickerAllowed(text, "DOT"))
    found.add("DOT-USD");
  if (/\bCHAINLINK\b/i.test(text) || ambiguousTickerAllowed(text, "LINK"))
    found.add("LINK-USD");
  if (/\bPOLYGON\b/i.test(text) || /\bMATIC\b/i.test(text)) found.add("POL-USD");
  if (/\bTRON\b/i.test(text) || ambiguousTickerAllowed(text, "TRX"))
    found.add("TRX-USD");
  if (/\bTONCOIN\b/i.test(text) || ambiguousTickerAllowed(text, "TON"))
    found.add("TON-USD");
  if (/\bSHIBA INU\b/i.test(text) || /\bSHIB\b/i.test(text))
    found.add("SHIB-USD");
  if (/\bLITECOIN\b/i.test(text) || /\bLTC\b/i.test(text)) found.add("LTC-USD");
  if (/\bBITCOIN CASH\b/i.test(text) || /\bBCH\b/i.test(text))
    found.add("BCH-USD");
  if (/\bCOSMOS\b/i.test(text) || ambiguousTickerAllowed(text, "ATOM"))
    found.add("ATOM-USD");
  if (/\bUNISWAP\b/i.test(text) || ambiguousTickerAllowed(text, "UNI"))
    found.add("UNI-USD");
  if (/\bNEAR PROTOCOL\b/i.test(text) || ambiguousTickerAllowed(text, "NEAR"))
    found.add("NEAR-USD");
  if (/\bAPTOS\b/i.test(text) || ambiguousTickerAllowed(text, "APT"))
    found.add("APT-USD");
  if (/\bINTERNET COMPUTER\b/i.test(text) || /\bICP\b/i.test(text))
    found.add("ICP-USD");
  if (/\bFILECOIN\b/i.test(text) || ambiguousTickerAllowed(text, "FIL"))
    found.add("FIL-USD");
  if (/\bARBITRUM\b/i.test(text) || ambiguousTickerAllowed(text, "ARB"))
    found.add("ARB-USD");
  if (/\bOPTIMISM\b/i.test(text) || ambiguousTickerAllowed(text, "OP"))
    found.add("OP-USD");
  if (/\bSUI NETWORK\b/i.test(text) || ambiguousTickerAllowed(text, "SUI"))
    found.add("SUI-USD");
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
