import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { TrendSignal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TrendRail({ trends }: { trends: TrendSignal[] }) {
  if (trends.length === 0) {
    return (
      <p className="text-sm text-[var(--fp-muted)]">
        Trend signals appear once headlines are loaded.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {trends.map((t) => {
        const Icon =
          t.direction === "up"
            ? ArrowUpRight
            : t.direction === "down"
              ? ArrowDownRight
              : ArrowRight;
        return (
          <li
            key={t.label}
            className="flex items-start justify-between gap-3 border-b border-[var(--fp-line)] pb-3 last:border-0"
          >
            <div>
              <p className="font-medium text-[var(--fp-ink)]">{t.label}</p>
              <p className="mt-1 text-xs text-[var(--fp-muted)]">
                {t.mentionCount} mention{t.mentionCount === 1 ? "" : "s"}
                {t.relatedTickers.length > 0 && " · "}
                {t.relatedTickers.map((sym, i) => (
                  <span key={sym}>
                    {i > 0 && ", "}
                    <Link
                      href={`/instrument/${encodeURIComponent(sym)}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {sym}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
            <div
              className={cn(
                "flex items-center gap-1 font-mono text-sm",
                t.direction === "up" && "text-[var(--fp-up)]",
                t.direction === "down" && "text-[var(--fp-down)]",
                t.direction === "flat" && "text-[var(--fp-muted)]",
              )}
            >
              <Icon className="size-4" />
              {t.score > 0 ? "+" : ""}
              {t.score}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
