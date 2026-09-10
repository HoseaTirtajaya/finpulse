import Link from "next/link";
import type { Instrument } from "@/lib/types";
import { cn } from "@/lib/utils";

export function InstrumentChip({
  instrument,
  active,
}: {
  instrument: Instrument;
  active?: boolean;
}) {
  const up = instrument.changePct >= 0;
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
            up ? "text-[var(--fp-up)]" : "text-[var(--fp-down)]",
          )}
        >
          {up ? "+" : ""}
          {instrument.changePct.toFixed(2)}%
        </span>
      </div>
      <span className="truncate text-xs text-[var(--fp-muted)]">
        {instrument.name}
      </span>
    </Link>
  );
}
