import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, hasDatabase } from "@/lib/db";
import { ingestRuns, sources } from "@/lib/db/schema";

/** Lightweight ops view of last ingest + source health. */
export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({
      ok: false,
      database: false,
      message: "DATABASE_URL not configured — live RSS fallback mode",
    });
  }

  try {
    const db = getDb();
    const [lastRun] = await db
      .select({
        id: ingestRuns.id,
        startedAt: ingestRuns.startedAt,
        finishedAt: ingestRuns.finishedAt,
        okCount: ingestRuns.okCount,
        failCount: ingestRuns.failCount,
        errors: ingestRuns.errors,
      })
      .from(ingestRuns)
      .orderBy(desc(ingestRuns.startedAt))
      .limit(1);

    const sourceRows = await db
      .select({
        id: sources.id,
        name: sources.name,
        kind: sources.kind,
        lastSuccessAt: sources.lastSuccessAt,
        enabled: sources.enabled,
      })
      .from(sources);

    const staleMs = 45 * 60 * 1000;
    const now = Date.now();
    const staleSources = sourceRows
      .filter((s) => s.enabled)
      .filter((s) => {
        if (!s.lastSuccessAt) return true;
        return now - s.lastSuccessAt.getTime() > staleMs;
      })
      .map((s) => s.id);

    return NextResponse.json({
      ok: (lastRun?.failCount ?? 0) === 0 && staleSources.length === 0,
      database: true,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            startedAt: lastRun.startedAt.toISOString(),
            finishedAt: lastRun.finishedAt?.toISOString() ?? null,
            okCount: lastRun.okCount,
            failCount: lastRun.failCount,
            errors: lastRun.errors,
          }
        : null,
      sourceCount: sourceRows.length,
      staleSources,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        database: true,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
