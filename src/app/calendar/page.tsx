import Link from "next/link";
import { connection } from "next/server";
import { getCachedMacroMonth } from "@/lib/cache";
import { EventExplainerBlurb } from "@/components/event-explainer-blurb";
import {
  parseYearMonth,
  toIsoDateUtc,
  yearMonthLabel,
  formatCalendarDateTime,
} from "@/lib/macro/date-format";
import type { DayMarkers } from "@/lib/macro/query-calendar";
import { cn } from "@/lib/utils";

export const instant = false;

type PageProps = {
  searchParams: Promise<{ month?: string }>;
};

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
  };
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // Monday-first: Sun=0 → 6
  const startPad = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: ({ iso: string; day: number } | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toIsoDateUtc(new Date(Date.UTC(year, month - 1, day)));
    cells.push({ iso, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function markerClass(markers: DayMarkers, iso: string) {
  const m = markers[iso];
  if (!m || (m.high === 0 && m.medium === 0)) return null;
  if (m.high > 0) return "bg-rose-500";
  return "bg-amber-500";
}

export default async function CalendarPage({ searchParams }: PageProps) {
  await connection();
  const params = await searchParams;
  const now = new Date();
  const parsed = params.month ? parseYearMonth(params.month) : null;
  const year = parsed?.year ?? now.getUTCFullYear();
  const month = parsed?.month ?? now.getUTCMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const { markers, events } = await getCachedMacroMonth(year, month);
  const cells = buildMonthCells(year, month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const todayIso = toIsoDateUtc(now);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--fp-accent)] uppercase">
            Economic calendar
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--fp-ink)] md:text-5xl">
            {yearMonthLabel(year, month)}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--fp-muted)]">
            Markers flag high/medium releases. Each agenda row includes a
            plain-English “what it is / why markets care” note. Click a day for
            deeper AI briefs. Dates as DD/MM/YYYY (UTC).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${prev.key}`}
            className="rounded-md border border-[var(--fp-line)] bg-white/70 px-3 py-1.5 text-sm hover:border-[var(--fp-accent)]"
          >
            ← {yearMonthLabel(prev.year, prev.month)}
          </Link>
          <Link
            href={`/calendar?month=${monthKey}`}
            className="rounded-md border border-[var(--fp-line)] bg-white/70 px-3 py-1.5 text-sm hover:border-[var(--fp-accent)]"
          >
            This month
          </Link>
          <Link
            href={`/calendar?month=${next.key}`}
            className="rounded-md border border-[var(--fp-line)] bg-white/70 px-3 py-1.5 text-sm hover:border-[var(--fp-accent)]"
          >
            {yearMonthLabel(next.year, next.month)} →
          </Link>
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-[var(--fp-line)] bg-white/55 p-4 md:p-6">
        <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) {
              return <div key={`pad-${i}`} className="min-h-16 rounded-md" />;
            }
            const mark = markerClass(markers, cell.iso);
            const hasEvents = Boolean(mark);
            const counts = markers[cell.iso];
            const inner = (
              <div
                className={cn(
                  "flex min-h-16 flex-col rounded-md border px-2 py-1.5 transition",
                  cell.iso === todayIso
                    ? "border-[var(--fp-accent)] bg-[var(--fp-accent)]/5"
                    : "border-[var(--fp-line)] bg-white/50",
                  hasEvents && "hover:border-[var(--fp-accent)]",
                )}
              >
                <span className="text-sm font-medium text-[var(--fp-ink)]">
                  {cell.day}
                </span>
                {mark && (
                  <span className="mt-auto flex items-center gap-1 pb-0.5">
                    <span className={cn("size-2 rounded-full", mark)} />
                    <span className="text-[10px] text-[var(--fp-muted)]">
                      {(counts?.high ?? 0) + (counts?.medium ?? 0)}
                    </span>
                  </span>
                )}
              </div>
            );
            return hasEvents ? (
              <Link key={cell.iso} href={`/calendar/${cell.iso}`}>
                {inner}
              </Link>
            ) : (
              <div key={cell.iso}>{inner}</div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--fp-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-rose-500" /> High impact
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" /> Medium only
          </span>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-[var(--fp-line)] bg-white/70 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--fp-ink)]">
          How to read this calendar
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[var(--fp-muted)]">
          <li>
            <span className="font-medium text-[var(--fp-ink)]">High</span>{" "}
            (rose) — usually moves FX, bonds, or equities within minutes
            (CPI, NFP, rate decisions).
          </li>
          <li>
            <span className="font-medium text-[var(--fp-ink)]">Medium</span>{" "}
            (amber) — useful context; smaller or slower price impact.
          </li>
          <li>
            Markets care about{" "}
            <span className="font-medium text-[var(--fp-ink)]">
              surprise vs forecast
            </span>
            , not the headline alone. Open a day for AI briefs on individual
            releases.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--fp-ink)]">
          Agenda
        </h2>
        <p className="mt-1 mb-4 text-sm text-[var(--fp-muted)]">
          High/medium events this month ({events.length}) — with a short
          explainer under each title.
        </p>
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--fp-line)] bg-white/40 px-6 py-12 text-center text-sm text-[var(--fp-muted)]">
            No high/medium events stored for this month. Run ingest to refresh
            the calendar.
          </div>
        ) : (
          <ul className="rounded-xl border border-[var(--fp-line)] bg-white/55 divide-y divide-[var(--fp-line)]">
            {events.map((ev) => {
              const day = toIsoDateUtc(new Date(ev.eventAt));
              return (
                <li key={ev.id}>
                  <Link
                    href={`/calendar/${day}`}
                    className="block px-4 py-3 transition hover:bg-white/70 md:px-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--fp-ink)]">
                          {ev.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--fp-muted)]">
                          {ev.country} · {formatCalendarDateTime(ev.eventAt)}
                          {ev.forecast ? ` · fcast ${ev.forecast}` : ""}
                          {ev.previous ? ` · prev ${ev.previous}` : ""}
                        </p>
                        <EventExplainerBlurb
                          title={ev.title}
                          sector={ev.sector}
                          country={ev.country}
                          compact
                        />
                      </div>
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
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
