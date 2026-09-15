import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { FINANCE_SOURCES } from "@/lib/news/sources/finance";
import { GENERAL_SOURCES } from "@/lib/news/sources/general";

/** Upsert registry rows for RSS + special adapters (single batch). */
export async function ensureSources(db: Db): Promise<void> {
  const rows = [
    ...FINANCE_SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      scope: "finance" as const,
      market: s.market ?? (s.language === "id" ? "ID" : "US"),
      language: s.language,
      kind: "rss" as const,
      enabled: true,
      category: s.category,
    })),
    ...GENERAL_SOURCES.map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      scope: "general" as const,
      market: s.market ?? (s.language === "id" ? "ID" : "global"),
      language: s.language,
      kind: "rss" as const,
      enabled: true,
      category: s.category,
    })),
    {
      id: "finnhub-economic",
      name: "Finnhub Economic Calendar",
      url: "https://finnhub.io/api/v1/calendar/economic",
      scope: "macro",
      market: "global",
      language: "en",
      kind: "economic_calendar" as const,
      enabled: true,
      category: "macro",
    },
    {
      id: "idx-announcements",
      name: "IDX Announcements",
      url: "https://www.idx.co.id/primary/NewsAnnouncement/GetNewsAnnouncement",
      scope: "finance",
      market: "ID",
      language: "id",
      kind: "idx_announcement" as const,
      enabled: true,
      category: "equities",
    },
  ];

  await db
    .insert(sources)
    .values(rows)
    .onConflictDoUpdate({
      target: sources.id,
      set: {
        name: sql`excluded.name`,
        url: sql`excluded.url`,
        scope: sql`excluded.scope`,
        market: sql`excluded.market`,
        language: sql`excluded.language`,
        kind: sql`excluded.kind`,
        enabled: sql`excluded.enabled`,
        category: sql`excluded.category`,
      },
    });
}

export async function markSourceSuccess(
  db: Db,
  sourceId: string,
  at = new Date(),
): Promise<void> {
  await db
    .update(sources)
    .set({ lastSuccessAt: at })
    .where(eq(sources.id, sourceId));
}

/** Skip adapter if last success was within cadenceMs. */
export function withinCadence(
  lastSuccessAt: Date | null | undefined,
  cadenceMs: number,
): boolean {
  if (!lastSuccessAt) return false;
  return Date.now() - lastSuccessAt.getTime() < cadenceMs;
}
