import Link from "next/link";
import { connection } from "next/server";
import { CryptoMarketsTable } from "@/components/crypto-markets-table";
import { getCachedCryptoMarkets } from "@/lib/cache";

export const instant = false;

export default async function CryptoPage() {
  await connection();
  const rows = await getCachedCryptoMarkets(50);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--fp-accent)] uppercase">
            Digital assets · CoinGecko
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--fp-ink)] md:text-5xl">
            Crypto markets
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--fp-muted)]">
            Top coins by market cap. Catalogued names link to instrument pages
            with related news and sentiment; rankings refresh about every 90s.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/?category=crypto"
            className="inline-flex h-8 items-center rounded-lg border border-[var(--fp-line)] bg-white/70 px-3 text-sm"
          >
            Crypto headlines
          </Link>
          <Link
            href="/recommendations?market=crypto"
            className="inline-flex h-8 items-center rounded-lg bg-[var(--fp-ink)] px-3 text-sm font-medium text-[var(--fp-paper)]"
          >
            Crypto ideas
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <CryptoMarketsTable rows={rows} />
      </div>
    </main>
  );
}
