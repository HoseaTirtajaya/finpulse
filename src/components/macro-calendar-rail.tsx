import { format } from "date-fns";
import type { MacroEvent } from "@/lib/news/query-news";
import { cn } from "@/lib/utils";

export function MacroCalendarRail({ events }: { events: MacroEvent[] }) {
  return (
    <div className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
        Macro calendar
      </h2>
      <p className="mt-1 text-sm text-[var(--fp-muted)]">
        High/medium impact events next 48h (Forex Factory).
      </p>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--fp-muted)]">
          No upcoming events in store. Run ingest or wait for the next cron.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="border-b border-[var(--fp-line)] pb-3 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-[var(--fp-ink)]">
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
                {ev.country} · {format(new Date(ev.eventAt), "MMM d · HH:mm")} UTC
                {ev.forecast ? ` · fcast ${ev.forecast}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
