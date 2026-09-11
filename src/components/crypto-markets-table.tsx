"use client";

import Link from "next/link";
import {
  formatChangePct,
  formatCompactUsd,
  formatPrice,
} from "@/lib/instruments";
import type { CryptoMarketRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function Sparkline({ values }: { values?: number[] }) {
  if (!values || values.length < 2) {
    return <span className="text-[var(--fp-muted)]">—</span>;
  }
  const w = 88;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = values[values.length - 1]! >= values[0]!;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={up ? "var(--fp-up)" : "var(--fp-down)"}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

export function CryptoMarketsTable({ rows }: { rows: CryptoMarketRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--fp-line)] bg-white/40 px-6 py-16 text-center text-sm text-[var(--fp-muted)]">
        CoinGecko rankings unavailable right now. Try again shortly — free-tier
        rate limits apply.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--fp-line)] bg-white/55">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--fp-line)] text-xs tracking-wider text-[var(--fp-muted)] uppercase">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Coin</th>
            <th className="px-4 py-3 font-medium text-right">Price</th>
            <th className="px-4 py-3 font-medium text-right">24h</th>
            <th className="px-4 py-3 font-medium text-right">Market cap</th>
            <th className="px-4 py-3 font-medium text-right">Volume 24h</th>
            <th className="px-4 py-3 font-medium">7d</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const up = row.changePct24h >= 0;
            const coin = (
              <div className="flex items-center gap-3">
                {row.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.imageUrl}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 rounded-full"
                  />
                ) : (
                  <span className="size-7 rounded-full bg-[var(--fp-chip)]" />
                )}
                <div>
                  <p className="font-medium text-[var(--fp-ink)]">{row.name}</p>
                  <p className="text-xs text-[var(--fp-muted)]">{row.symbol}</p>
                </div>
              </div>
            );

            return (
              <tr
                key={row.coingeckoId}
                className="border-b border-[var(--fp-line)]/70 last:border-0 hover:bg-white/70"
              >
                <td className="px-4 py-3 font-mono text-[var(--fp-muted)]">
                  {row.rank || "—"}
                </td>
                <td className="px-4 py-3">
                  {row.instrumentSymbol ? (
                    <Link
                      href={`/instrument/${encodeURIComponent(row.instrumentSymbol)}`}
                      className="block transition hover:opacity-80"
                    >
                      {coin}
                    </Link>
                  ) : (
                    coin
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatPrice(row.price, "USD", "crypto")}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-mono",
                    up ? "text-[var(--fp-up)]" : "text-[var(--fp-down)]",
                  )}
                >
                  {formatChangePct(row.changePct24h)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[var(--fp-muted)]">
                  {formatCompactUsd(row.marketCap)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-[var(--fp-muted)]">
                  {formatCompactUsd(row.volume24h)}
                </td>
                <td className="px-4 py-3">
                  <Sparkline values={row.sparkline7d} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
