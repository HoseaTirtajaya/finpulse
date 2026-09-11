"use client";

import { getMarketHours } from "@/lib/market-hours";
import { cn } from "@/lib/utils";

export function MarketHoursRail() {
  const statuses = getMarketHours();
  return (
    <div className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
        Market hours
      </h2>
      <ul className="mt-3 space-y-3">
        {statuses.map((s) => (
          <li
            key={s.id}
            className="flex items-start justify-between gap-3 border-b border-[var(--fp-line)] pb-3 last:border-0"
          >
            <div>
              <p className="font-medium text-[var(--fp-ink)]">{s.label}</p>
              <p className="mt-0.5 text-xs text-[var(--fp-muted)]">{s.detail}</p>
            </div>
            <span
              className={cn(
                "rounded-sm px-2 py-0.5 text-xs font-medium",
                s.open
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-slate-100 text-slate-700",
              )}
            >
              {s.open ? "Open" : "Closed"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
