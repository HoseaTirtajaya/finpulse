import Link from "next/link";
import type { Instrument, Quote } from "@/lib/types";
import { formatChangePct, formatPrice } from "@/lib/instruments";
import { cn } from "@/lib/utils";

export function InstrumentChip({
  instrument,
  quote,
  active,
}: {
  instrument: Instrument;
  quote?: Quote | null;
  active?: boolean;
}) {
  const changePct = quote?.changePct ?? null;
  const up = changePct != null ? changePct >= 0 : true;
  return (
    <Link
      href={`/instrument/${encodeURIComponent(instrument.symbol)}`}
      className={cn(
        "instrument-chip flex min-w-[9.5rem] flex-col gap-1 rounded-md border px-3 py-2 transition",
        active
          ? "border-[var(--fp-accent)] bg-[var(--fp-accent-soft)]"
          : "border-[var(--fp-line)] bg-white/40 hover:border-[var(--fp-accent)]/60",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm font-semibold tracking-tight">
          {instrument.symbol}
        </span>
        <span
          className={cn(
            "font-mono text-xs",
            changePct == null
              ? "text-[var(--fp-muted)]"
              : up
                ? "text-[var(--fp-up)]"
                : "text-[var(--fp-down)]",
          )}
        >
          {formatChangePct(changePct)}
        </span>
      </div>
      <span className="truncate text-xs text-[var(--fp-muted)]">
        {instrument.name}
      </span>
      <span className="font-mono text-[10px] text-[var(--fp-muted)]">
        {formatPrice(quote?.price, instrument.currency, instrument.type)}
      </span>
    </Link>
  );
}
