"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { Quote } from "@/lib/types";
import {
  FX_CURRENCIES,
  FX_RATE_SYMBOLS,
  buildFxRateBook,
  buildIdrConversionBoard,
  convertCurrency,
  crossRate,
  currencyLabel,
  emptyFxRateBook,
  formatFxAmount,
  type FxCurrency,
} from "@/lib/fx/convert";
import { cn } from "@/lib/utils";

const PRESETS: { amount: number; from: FxCurrency }[] = [
  { amount: 1_000_000, from: "IDR" },
  { amount: 10_000_000, from: "IDR" },
  { amount: 100_000_000, from: "IDR" },
  { amount: 100, from: "USD" },
  { amount: 1_000, from: "USD" },
];

const TABLE_AMOUNTS = [1_000_000, 10_000_000, 100_000_000] as const;

export function CurrencyConverter() {
  const [from, setFrom] = useState<FxCurrency>("IDR");
  const [to, setTo] = useState<FxCurrency>("USD");
  const [amountStr, setAmountStr] = useState("1000000");
  const [tableAmount, setTableAmount] = useState<number>(1_000_000);
  const [rates, setRates] = useState(emptyFxRateBook);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = FX_RATE_SYMBOLS.map(encodeURIComponent).join(",");
        const res = await fetch(`/api/quotes?symbols=${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("quotes failed");
        const data = (await res.json()) as { quotes: Quote[] };
        if (!cancelled) setRates(buildFxRateBook(data.quotes ?? []));
      } catch {
        if (!cancelled) setError("Live FX rates unavailable right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const amount = useMemo(() => {
    const n = Number(String(amountStr).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }, [amountStr]);

  const converted = useMemo(
    () => convertCurrency(amount, from, to, rates),
    [amount, from, to, rates],
  );

  const unitRate = useMemo(
    () => crossRate(from, to, rates),
    [from, to, rates],
  );

  const boardRows = useMemo(
    () => buildIdrConversionBoard(tableAmount, rates),
    [tableAmount, rates],
  );

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <div className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
            Currency convert
          </h2>
          <p className="mt-1 text-sm text-[var(--fp-muted)]">
            IDR-first desk · USD, EUR, GBP, SGD + majors
          </p>
        </div>
        {loading && (
          <span className="text-xs text-[var(--fp-muted)]">Updating…</span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
            Amount
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--fp-line)] bg-white/80 px-3 py-2 font-mono text-sm text-[var(--fp-ink)] outline-none focus:border-[var(--fp-accent)]"
          />
        </label>

        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="block min-w-0">
            <span className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
              From
            </span>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value as FxCurrency)}
              className="mt-1 w-full rounded-md border border-[var(--fp-line)] bg-white/80 px-2 py-2 text-sm text-[var(--fp-ink)] outline-none focus:border-[var(--fp-accent)]"
            >
              {FX_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {currencyLabel(c)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={swap}
            className="mb-0.5 inline-flex size-9 items-center justify-center rounded-md border border-[var(--fp-line)] bg-white/70 text-[var(--fp-ink)] transition hover:border-[var(--fp-accent)] hover:text-[var(--fp-accent)]"
            title="Swap currencies"
            aria-label="Swap currencies"
          >
            <ArrowLeftRight className="size-4" />
          </button>

          <label className="block min-w-0">
            <span className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
              To
            </span>
            <select
              value={to}
              onChange={(e) => setTo(e.target.value as FxCurrency)}
              className="mt-1 w-full rounded-md border border-[var(--fp-line)] bg-white/80 px-2 py-2 text-sm text-[var(--fp-ink)] outline-none focus:border-[var(--fp-accent)]"
            >
              {FX_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {currencyLabel(c)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-lg border border-[var(--fp-line)] bg-[var(--fp-chip)]/60 px-3 py-3">
          <p className="text-xs tracking-wider text-[var(--fp-muted)] uppercase">
            Result
          </p>
          <p className="mt-1 font-mono text-xl text-[var(--fp-ink)]">
            {formatFxAmount(converted, to)}
          </p>
          <p className="mt-1 text-xs text-[var(--fp-muted)]">
            {unitRate != null
              ? `1 ${from} ≈ ${formatFxAmount(unitRate, to)}`
              : "Rate unavailable"}
            {rates.asOf
              ? ` · as of ${new Date(rates.asOf).toLocaleTimeString()}`
              : ""}
          </p>
        </div>

        {error && <p className="text-xs text-amber-800">{error}</p>}

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={`${p.from}-${p.amount}`}
              type="button"
              onClick={() => {
                setFrom(p.from);
                setAmountStr(String(p.amount));
                if (p.from === "IDR") setTableAmount(p.amount);
                if (p.from === to) setTo(p.from === "IDR" ? "USD" : "IDR");
              }}
              className={cn(
                "rounded-sm px-2 py-1 text-xs transition",
                "bg-white/60 text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
              )}
            >
              {p.from === "IDR"
                ? `Rp ${(p.amount / 1_000_000).toFixed(0)}jt`
                : `$${p.amount.toLocaleString()}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--fp-line)] pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
            IDR → majors
          </h3>
          <div className="flex flex-wrap gap-1">
            {TABLE_AMOUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setTableAmount(n);
                  setFrom("IDR");
                  setAmountStr(String(n));
                }}
                className={cn(
                  "rounded-sm px-2 py-0.5 text-[11px] transition",
                  tableAmount === n
                    ? "bg-[var(--fp-ink)] text-[var(--fp-paper)]"
                    : "bg-white/60 text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
                )}
              >
                Rp {(n / 1_000_000).toFixed(0)}jt
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--fp-line)]">
          <table className="w-full min-w-[240px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--fp-line)] bg-white/40 text-[var(--fp-muted)]">
                <th className="px-2.5 py-2 font-medium">CCY</th>
                <th className="px-2.5 py-2 font-medium text-right">
                  {formatFxAmount(tableAmount, "IDR")}
                </th>
                <th className="px-2.5 py-2 font-medium text-right">1 CCY→IDR</th>
              </tr>
            </thead>
            <tbody>
              {boardRows.map((row) => (
                <tr
                  key={row.currency}
                  className="border-b border-[var(--fp-line)]/70 last:border-0 hover:bg-white/50"
                >
                  <td className="px-2.5 py-2">
                    <button
                      type="button"
                      className="font-medium text-[var(--fp-ink)] hover:text-[var(--fp-accent)]"
                      onClick={() => {
                        setFrom("IDR");
                        setTo(row.currency);
                        setAmountStr(String(tableAmount));
                      }}
                      title={`Convert IDR → ${row.currency}`}
                    >
                      {row.currency}
                    </button>
                    <p className="text-[10px] text-[var(--fp-muted)]">
                      {currencyLabel(row.currency).split(" · ")[1]}
                    </p>
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-[var(--fp-ink)]">
                    {formatFxAmount(row.converted, row.currency)}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-[var(--fp-muted)]">
                    {formatFxAmount(row.idrPerUnit, "IDR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--fp-muted)]">
          Mid rates via Yahoo; not a bank quote. Click a CCY to load the
          converter.
        </p>
      </div>
    </div>
  );
}
