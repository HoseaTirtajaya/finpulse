/** Simple market-hours indicator for JKT (WIB) and US equities (ET). */

function zonedParts(timeZone: string, date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const weekday = parts.weekday;
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  const minute = Number(parts.minute);
  return { weekday, minutes: hour * 60 + minute };
}

function isWeekday(weekday: string) {
  return !["Sat", "Sun"].includes(weekday);
}

export type MarketHoursStatus = {
  id: "JKT" | "NYSE";
  label: string;
  open: boolean;
  detail: string;
};

export function getMarketHours(now = new Date()): MarketHoursStatus[] {
  const jkt = zonedParts("Asia/Jakarta", now);
  // IDX regular session ~ 09:00–15:50 WIB (simplified; ignores lunch break)
  const jktOpen =
    isWeekday(jkt.weekday) && jkt.minutes >= 9 * 60 && jkt.minutes < 15 * 60 + 50;

  const ny = zonedParts("America/New_York", now);
  // NYSE 09:30–16:00 ET
  const nyOpen =
    isWeekday(ny.weekday) &&
    ny.minutes >= 9 * 60 + 30 &&
    ny.minutes < 16 * 60;

  return [
    {
      id: "JKT",
      label: "IDX (Jakarta)",
      open: jktOpen,
      detail: jktOpen ? "Regular session" : "Closed / outside regular hours",
    },
    {
      id: "NYSE",
      label: "NYSE / Nasdaq",
      open: nyOpen,
      detail: nyOpen ? "Regular session" : "Closed / outside regular hours",
    },
  ];
}
