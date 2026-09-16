import Link from "next/link";
import {
  plainImpactLabel,
  plainRegionLabel,
} from "@/components/event-explainer-blurb";
import type { MacroEvent } from "@/lib/news/query-news";
import {
  formatCalendarDateTime,
  toIsoDateUtc,
} from "@/lib/macro/date-format";
import { explainMacroEvent } from "@/lib/macro/event-explainer";
import { cn } from "@/lib/utils";

export function MacroCalendarRail({ events }: { events: MacroEvent[] }) {
  return (
    <div className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
            Coming up
          </h2>
          <p className="mt-1 text-sm text-[var(--fp-muted)]">
            Economy updates in the next 2 days — explained simply.
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
          No upcoming events yet. Check back after the next update.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {events.map((ev) => {
            const day = toIsoDateUtc(new Date(ev.eventAt));
            const explained = explainMacroEvent(ev.title, {
              sector: ev.sector,
              country: ev.country,
            });
            const region = plainRegionLabel(ev.country);
            return (
              <li
                key={ev.id}
                className="border-b border-[var(--fp-line)] pb-3 last:border-0"
              >
                <Link href={`/calendar/${day}`} className="block group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--fp-ink)] group-hover:text-[var(--fp-accent)]">
                      {explained.simpleTitle}
                    </p>
                    <span
                      className={cn(
                        "max-w-[7.5rem] shrink-0 rounded-sm px-1.5 py-0.5 text-center text-[10px] font-medium leading-tight",
                        ev.impact === "high"
                          ? "bg-rose-100 text-rose-900"
                          : "bg-amber-100 text-amber-900",
                      )}
                    >
                      {plainImpactLabel(ev.impact)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--fp-muted)]">
                    {region || ev.country} · {formatCalendarDateTime(ev.eventAt)}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-[var(--fp-muted)]">
                    {explained.whatItIs}
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
