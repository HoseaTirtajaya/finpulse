import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CalendarEventList } from "@/components/calendar-event-list";
import { DateImpactPanel } from "@/components/date-impact-panel";
import { getCachedMacroEventsForDay } from "@/lib/cache";
import {
  formatCalendarDate,
  parseIsoDateUtc,
} from "@/lib/macro/date-format";
import { shiftIsoDate } from "@/lib/macro/query-calendar";

export const instant = false;

type PageProps = {
  params: Promise<{ date: string }>;
};

export default async function CalendarDayPage({ params }: PageProps) {
  await connection();
  const { date: raw } = await params;
  const isoDate = decodeURIComponent(raw).trim();
  if (!parseIsoDateUtc(isoDate)) notFound();

  const events = await getCachedMacroEventsForDay(isoDate);
  const prev = shiftIsoDate(isoDate, -1);
  const next = shiftIsoDate(isoDate, 1);
  const monthKey = isoDate.slice(0, 7);
  const highMed = events.filter(
    (e) => e.impact === "high" || e.impact === "medium",
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/calendar?month=${monthKey}`}
          className="text-sm text-[var(--fp-accent)] hover:underline"
        >
          ← Back to calendar
        </Link>
        <div className="flex gap-2 text-sm">
          {prev && (
            <Link
              href={`/calendar/${prev}`}
              className="rounded-md border border-[var(--fp-line)] bg-white/70 px-3 py-1.5 hover:border-[var(--fp-accent)]"
            >
              ← {formatCalendarDate(prev + "T00:00:00.000Z")}
            </Link>
          )}
          {next && (
            <Link
              href={`/calendar/${next}`}
              className="rounded-md border border-[var(--fp-line)] bg-white/70 px-3 py-1.5 hover:border-[var(--fp-accent)]"
            >
              {formatCalendarDate(next + "T00:00:00.000Z")} →
            </Link>
          )}
        </div>
      </div>

      <section className="mt-6">
        <p className="text-xs font-semibold tracking-[0.2em] text-[var(--fp-accent)] uppercase">
          Calendar day
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--fp-ink)] md:text-5xl">
          {formatCalendarDate(`${isoDate}T00:00:00.000Z`)}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--fp-muted)]">
          {events.length} event{events.length === 1 ? "" : "s"} stored for this
          UTC day
          {highMed.length > 0
            ? ` · ${highMed.length} high/medium`
            : ""}
          . Use AI brief on an event for key points, or the day analyzer below
          for overall market lean. Not financial advice.
        </p>
      </section>

      <section className="mt-8 rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
          Events
        </h2>
        <p className="mt-1 text-sm text-[var(--fp-muted)]">
          Password-gated AI briefs explain what the release typically means —
          no scraped commentary; built from calendar fields (plus official
          source link when available).
        </p>
        <CalendarEventList events={events} />
      </section>

      <div className="mt-8">
        <DateImpactPanel isoDate={isoDate} eventCount={events.length} />
      </div>
    </main>
  );
}
