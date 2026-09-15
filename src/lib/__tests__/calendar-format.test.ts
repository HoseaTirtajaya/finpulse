import { describe, expect, it } from "vitest";
import {
  formatCalendarDate,
  formatCalendarDateTime,
  parseIsoDateUtc,
  parseYearMonth,
  toIsoDateUtc,
} from "@/lib/macro/date-format";
import { shiftIsoDate } from "@/lib/macro/query-calendar";

describe("calendar date format", () => {
  it("formats DD/MM/YYYY", () => {
    expect(formatCalendarDate("2026-09-15T12:30:00.000Z")).toBe("15/09/2026");
  });

  it("formats DD/MM/YYYY · HH:mm UTC", () => {
    expect(formatCalendarDateTime("2026-09-15T12:30:00.000Z")).toBe(
      "15/09/2026 · 12:30 UTC",
    );
  });

  it("parses ISO dates and year-month", () => {
    expect(parseIsoDateUtc("2026-09-15")?.toISOString()).toBe(
      "2026-09-15T00:00:00.000Z",
    );
    expect(parseIsoDateUtc("15/09/2026")).toBeNull();
    expect(parseYearMonth("2026-09")).toEqual({ year: 2026, month: 9 });
    expect(toIsoDateUtc(new Date("2026-09-15T22:00:00.000Z"))).toBe(
      "2026-09-15",
    );
  });

  it("shifts ISO dates", () => {
    expect(shiftIsoDate("2026-09-15", 1)).toBe("2026-09-16");
    expect(shiftIsoDate("2026-09-01", -1)).toBe("2026-08-31");
  });
});
