import { eq, lt } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getDb } from "@/lib/db";
import { articles, ingestRuns } from "@/lib/db/schema";
import { linkArticleInstruments } from "@/lib/ingest/article-links";
import { ingestDailyBars } from "@/lib/ingest/daily-bars";
import { ingestFinnhubCalendar } from "@/lib/ingest/finnhub-calendar";
import { ingestFundamentals } from "@/lib/ingest/fundamentals";
import { ingestIdxAnnouncements } from "@/lib/ingest/idx";
import { ingestRss } from "@/lib/ingest/rss";
import { ensureSources } from "@/lib/ingest/sources";

export type IngestSummary = {
  startedAt: string;
  finishedAt: string;
  okCount: number;
  failCount: number;
  errors: { source: string; message: string }[];
  runId: string;
  retainedDeleted?: number;
  articleLinks?: { linked: number; scanned: number };
};

const RETENTION_DAYS = 45;

async function pruneOldArticles(
  db: ReturnType<typeof getDb>,
): Promise<number> {
  const cutoff = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const deleted = await db
    .delete(articles)
    .where(lt(articles.publishedAt, cutoff))
    .returning({ id: articles.id });
  return deleted.length;
}

export async function runIngest(options?: {
  /** Skip slow daily-bar top-up (useful for news-only runs). */
  skipBars?: boolean;
}): Promise<IngestSummary> {
  const db = getDb();
  const startedAt = new Date();
  const runId = `run-${startedAt.getTime()}`;

  await db.insert(ingestRuns).values({
    id: runId,
    startedAt,
    okCount: 0,
    failCount: 0,
    errors: [],
  });

  await ensureSources(db);

  const parts = await Promise.all([
    ingestRss(db),
    ingestFinnhubCalendar(db),
    ingestIdxAnnouncements(db),
  ]);

  let articleLinks = { linked: 0, scanned: 0 };
  try {
    articleLinks = await linkArticleInstruments(db);
  } catch (err) {
    console.error("article_instruments link failed", err);
    parts.push({
      ok: 0,
      fail: 1,
      errors: [
        {
          source: "article-links",
          message: err instanceof Error ? err.message : String(err),
        },
      ],
    });
  }

  if (!options?.skipBars) {
    try {
      parts.push(await ingestDailyBars(db));
    } catch (err) {
      console.error("daily bars ingest failed", err);
      parts.push({
        ok: 0,
        fail: 1,
        errors: [
          {
            source: "daily-bars",
            message: err instanceof Error ? err.message : String(err),
          },
        ],
      });
    }
  }

  try {
    parts.push(await ingestFundamentals(db));
  } catch (err) {
    console.error("fundamentals ingest failed", err);
    parts.push({
      ok: 0,
      fail: 1,
      errors: [
        {
          source: "fundamentals",
          message: err instanceof Error ? err.message : String(err),
        },
      ],
    });
  }

  let retainedDeleted = 0;
  try {
    retainedDeleted = await pruneOldArticles(db);
  } catch (err) {
    console.error("article retention prune failed", err);
  }

  const errors = parts.flatMap((p) => p.errors);
  const okCount = parts.reduce((n, p) => n + p.ok, 0);
  const failCount = parts.reduce((n, p) => n + p.fail, 0);
  const finishedAt = new Date();

  await db
    .update(ingestRuns)
    .set({
      finishedAt,
      okCount,
      failCount,
      errors,
    })
    .where(eq(ingestRuns.id, runId));

  try {
    revalidateTag("news", "max");
    revalidateTag("macro", "max");
    revalidateTag("candles", "max");
    revalidateTag("quotes", "max");
  } catch {
    // Outside Next.js request context (CLI ingest) — tags are a no-op.
  }

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    okCount,
    failCount,
    errors,
    runId,
    retainedDeleted,
    articleLinks,
  };
}
