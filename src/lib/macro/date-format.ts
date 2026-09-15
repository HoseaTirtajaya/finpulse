function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function asDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** User-facing calendar date: DD/MM/YYYY (UTC) */
export function formatCalendarDate(value: Date | string): string {
  const d = asDate(value);
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** User-facing calendar datetime: DD/MM/YYYY · HH:mm UTC */
export function formatCalendarDateTime(value: Date | string): string {
  const d = asDate(value);
  return `${formatCalendarDate(d)} · ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

/** ISO day key YYYY-MM-DD in UTC */
export function toIsoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse YYYY-MM-DD as UTC midnight; null if invalid */
export function parseIsoDateUtc(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (toIsoDateUtc(d) !== iso) return null;
  return d;
}

/** Inclusive UTC day end (23:59:59.999Z) */
export function utcDayEnd(isoDate: string): Date | null {
  const start = parseIsoDateUtc(isoDate);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Parse YYYY-MM month key */
export function parseYearMonth(ym: string): { year: number; month: number } | null {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function yearMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
