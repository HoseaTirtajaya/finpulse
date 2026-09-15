import Link from "next/link";
import type { MacroEvent } from "@/lib/news/query-news";
import {
  formatCalendarDateTime,
  toIsoDateUtc,
} from "@/lib/macro/date-format";
import { cn } from "@/lib/utils";

export function MacroCalendarRail({ events }: { events: MacroEvent[] }) {
  return (
    <div className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
            Macro calendar
          </h2>
          <p className="mt-1 text-sm text-[var(--fp-muted)]">
            High/medium impact events next 48h (economic calendar).
          </p>
        </div>
        <Link
          href="/calendar"
          className="shrink-0 text-xs font-medium text-[var(--fp-accent)] hover:underline"
        >
          Full calendar
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--fp-muted)]">
          No upcoming events in store. Run ingest or wait for the next cron.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {events.map((ev) => {
            const day = toIsoDateUtc(new Date(ev.eventAt));
            return (
              <li
                key={ev.id}
                className="border-b border-[var(--fp-line)] pb-3 last:border-0"
              >
                <Link href={`/calendar/${day}`} className="block group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--fp-ink)] group-hover:text-[var(--fp-accent)]">
                      {ev.title}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase",
                        ev.impact === "high"
                          ? "bg-rose-100 text-rose-900"
                          : "bg-amber-100 text-amber-900",
                      )}
                    >
                      {ev.impact}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--fp-muted)]">
                    {ev.country} · {formatCalendarDateTime(ev.eventAt)}
                    {ev.forecast ? ` · fcast ${ev.forecast}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
