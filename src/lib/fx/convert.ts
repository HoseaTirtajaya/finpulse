import type { Quote } from "@/lib/types";

/**
 * Display / convert order: IDR first, then USD, then other majors.
 * Kept separate from Instrument.currency so the desk can grow FX freely.
 */
export const FX_CURRENCIES = [
  "IDR",
  "USD",
  "EUR",
  "GBP",
  "SGD",
  "JPY",
  "AUD",
  "CHF",
  "HKD",
] as const;

export type FxCurrency = (typeof FX_CURRENCIES)[number];

/** Foreign majors shown in the IDR conversion table (excludes IDR itself). */
export const FX_TABLE_TARGETS: FxCurrency[] = FX_CURRENCIES.filter(
  (c) => c !== "IDR",
);

/** Yahoo symbols used to build a USD cross book. */
export const FX_RATE_SYMBOLS = [
  "USDIDR", // IDR per 1 USD
  "EURUSD", // USD per 1 EUR
  "GBPUSD=X", // USD per 1 GBP
  "AUDUSD=X", // USD per 1 AUD
  "USDSGD=X", // SGD per 1 USD
  "USDJPY=X", // JPY per 1 USD
  "USDCHF=X", // CHF per 1 USD
  "USDHKD=X", // HKD per 1 USD
] as const;

export type FxRateBook = {
  USDIDR: number | null;
  EURUSD: number | null;
  GBPUSD: number | null;
  AUDUSD: number | null;
  USDSGD: number | null;
  USDJPY: number | null;
  USDCHF: number | null;
  USDHKD: number | null;
  asOf: string | null;
};

export function emptyFxRateBook(): FxRateBook {
  return {
    USDIDR: null,
    EURUSD: null,
    GBPUSD: null,
    AUDUSD: null,
    USDSGD: null,
    USDJPY: null,
    USDCHF: null,
    USDHKD: null,
    asOf: null,
  };
}

function pickQuote(quotes: Quote[], ...keys: string[]): Quote | undefined {
  const upper = keys.map((k) => k.toUpperCase());
  return quotes.find((q) => upper.includes(q.symbol.toUpperCase()));
}

export function buildFxRateBook(quotes: Quote[]): FxRateBook {
  const usdidr = pickQuote(quotes, "USDIDR", "USDIDR=X");
  const eurusd = pickQuote(quotes, "EURUSD", "EURUSD=X");
  const gbpusd = pickQuote(quotes, "GBPUSD=X", "GBPUSD");
  const audusd = pickQuote(quotes, "AUDUSD=X", "AUDUSD");
  const usdsgd = pickQuote(quotes, "USDSGD=X", "USDSGD");
  const usdjpy = pickQuote(quotes, "USDJPY=X", "USDJPY");
  const usdchf = pickQuote(quotes, "USDCHF=X", "USDCHF");
  const usdhkd = pickQuote(quotes, "USDHKD=X", "USDHKD");

  const asOfCandidates = [
    usdidr,
    eurusd,
    gbpusd,
    audusd,
    usdsgd,
    usdjpy,
    usdchf,
    usdhkd,
  ]
    .map((q) => q?.asOf)
    .filter(Boolean) as string[];

  return {
    USDIDR: usdidr?.price ?? null,
    EURUSD: eurusd?.price ?? null,
    GBPUSD: gbpusd?.price ?? null,
    AUDUSD: audusd?.price ?? null,
    USDSGD: usdsgd?.price ?? null,
    USDJPY: usdjpy?.price ?? null,
    USDCHF: usdchf?.price ?? null,
    USDHKD: usdhkd?.price ?? null,
    asOf: asOfCandidates[0] ?? null,
  };
}

/** Convert amount into USD using the live rate book. */
export function toUsd(
  amount: number,
  currency: FxCurrency,
  rates: FxRateBook,
): number | null {
  if (!Number.isFinite(amount)) return null;
  switch (currency) {
    case "USD":
      return amount;
    case "IDR":
      return rates.USDIDR && rates.USDIDR > 0 ? amount / rates.USDIDR : null;
    case "EUR":
      return rates.EURUSD && rates.EURUSD > 0 ? amount * rates.EURUSD : null;
    case "GBP":
      return rates.GBPUSD && rates.GBPUSD > 0 ? amount * rates.GBPUSD : null;
    case "AUD":
      return rates.AUDUSD && rates.AUDUSD > 0 ? amount * rates.AUDUSD : null;
    case "SGD":
      return rates.USDSGD && rates.USDSGD > 0 ? amount / rates.USDSGD : null;
    case "JPY":
      return rates.USDJPY && rates.USDJPY > 0 ? amount / rates.USDJPY : null;
    case "CHF":
      return rates.USDCHF && rates.USDCHF > 0 ? amount / rates.USDCHF : null;
    case "HKD":
      return rates.USDHKD && rates.USDHKD > 0 ? amount / rates.USDHKD : null;
    default:
      return null;
  }
}

export function fromUsd(
  usd: number,
  currency: FxCurrency,
  rates: FxRateBook,
): number | null {
  if (!Number.isFinite(usd)) return null;
  switch (currency) {
    case "USD":
      return usd;
    case "IDR":
      return rates.USDIDR && rates.USDIDR > 0 ? usd * rates.USDIDR : null;
    case "EUR":
      return rates.EURUSD && rates.EURUSD > 0 ? usd / rates.EURUSD : null;
    case "GBP":
      return rates.GBPUSD && rates.GBPUSD > 0 ? usd / rates.GBPUSD : null;
    case "AUD":
      return rates.AUDUSD && rates.AUDUSD > 0 ? usd / rates.AUDUSD : null;
    case "SGD":
      return rates.USDSGD && rates.USDSGD > 0 ? usd * rates.USDSGD : null;
    case "JPY":
      return rates.USDJPY && rates.USDJPY > 0 ? usd * rates.USDJPY : null;
    case "CHF":
      return rates.USDCHF && rates.USDCHF > 0 ? usd * rates.USDCHF : null;
    case "HKD":
      return rates.USDHKD && rates.USDHKD > 0 ? usd * rates.USDHKD : null;
    default:
      return null;
  }
}

export function convertCurrency(
  amount: number,
  from: FxCurrency,
  to: FxCurrency,
  rates: FxRateBook,
): number | null {
  if (from === to) return amount;
  const usd = toUsd(amount, from, rates);
  if (usd == null) return null;
  return fromUsd(usd, to, rates);
}

/** Units of `quote` per 1 unit of `base` (e.g. how many IDR per 1 USD). */
export function crossRate(
  base: FxCurrency,
  quote: FxCurrency,
  rates: FxRateBook,
): number | null {
  return convertCurrency(1, base, quote, rates);
}

export type IdrBoardRow = {
  currency: FxCurrency;
  /** Value of `idrAmount` expressed in this currency */
  converted: number | null;
  /** How many IDR for 1 unit of this currency */
  idrPerUnit: number | null;
};

/** Build IDR → multi-currency table rows for a given rupiah amount. */
export function buildIdrConversionBoard(
  idrAmount: number,
  rates: FxRateBook,
): IdrBoardRow[] {
  return FX_TABLE_TARGETS.map((currency) => ({
    currency,
    converted: convertCurrency(idrAmount, "IDR", currency, rates),
    idrPerUnit: crossRate(currency, "IDR", rates),
  }));
}

export function formatFxAmount(
  amount: number | null,
  currency: FxCurrency,
): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  if (currency === "IDR") {
    return `Rp ${Math.round(amount).toLocaleString("id-ID")}`;
  }
  if (currency === "JPY") {
    return `¥${amount.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}`;
  }

  const intlCurrency =
    currency === "GBP" ||
    currency === "EUR" ||
    currency === "AUD" ||
    currency === "CHF" ||
    currency === "SGD" ||
    currency === "HKD" ||
    currency === "USD"
      ? currency
      : "USD";

  try {
    return amount.toLocaleString(undefined, {
      style: "currency",
      currency: intlCurrency,
      maximumFractionDigits: currency === "USD" || currency === "HKD" ? 4 : 4,
    });
  } catch {
    return `${amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${currency}`;
  }
}

export function currencyLabel(c: FxCurrency): string {
  switch (c) {
    case "IDR":
      return "IDR · Rupiah";
    case "USD":
      return "USD · US Dollar";
    case "EUR":
      return "EUR · Euro";
    case "GBP":
      return "GBP · Pound";
    case "SGD":
      return "SGD · Singapore";
    case "JPY":
      return "JPY · Yen";
    case "AUD":
      return "AUD · Aussie";
    case "CHF":
      return "CHF · Swiss franc";
    case "HKD":
      return "HKD · Hong Kong";
  }
}
