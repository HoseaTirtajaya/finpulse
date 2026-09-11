import { createHash } from "crypto";
import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { articles, sources } from "@/lib/db/schema";
import { normalizeArticleUrl } from "@/lib/ingest/helpers";
import type { AdapterResult } from "@/lib/ingest/rss";
import {
  markSourceSuccess,
  withinCadence,
} from "@/lib/ingest/sources";
import { extractTickers, slugId } from "@/lib/news/sources/shared";

const SOURCE_ID = "idx-announcements";
const IDX_CADENCE_MS = 15 * 60 * 1000;
const IDX_ENDPOINTS = [
  "https://www.idx.co.id/primary/NewsAnnouncement/GetNewsAnnouncement?length=20&start=0",
  "https://www.idx.co.id/primary/Home/GetNewsAnnouncement?length=20&start=0",
];

export type IdxAnnouncement = {
  title: string;
  url: string;
  publishedAt: Date;
  ticker?: string;
  summary?: string;
};

/** Normalize various IDX JSON shapes into announcement rows. */
export function parseIdxAnnouncements(payload: unknown): IdxAnnouncement[] {
  const root = payload as Record<string, unknown> | unknown[];
  let rows: unknown[] = [];
  if (Array.isArray(root)) {
    rows = root;
  } else if (root && typeof root === "object") {
    const data = root.data ?? root.Data ?? root.results ?? root.Results;
    if (Array.isArray(data)) rows = data;
    else if (data && typeof data === "object") {
      const inner = data as Record<string, unknown>;
      const nested = inner.data ?? inner.items;
      if (Array.isArray(nested)) rows = nested;
    }
  }

  const out: IdxAnnouncement[] = [];
  for (const raw of rows) {
    const r = raw as Record<string, unknown>;
    const pengumuman =
      (r.pengumuman as Record<string, unknown> | undefined) ??
      (r.Pengumuman as Record<string, unknown> | undefined) ??
      r;
    const title = String(
      pengumuman.JudulPengumuman ??
        pengumuman.Title ??
        pengumuman.title ??
        pengumuman.judul ??
        "",
    ).trim();
    if (!title) continue;
    const ticker = String(
      pengumuman.Kode_Emiten ??
        pengumuman.KodeEmiten ??
        pengumuman.emiten ??
        pengumuman.ticker ??
        "",
    )
      .trim()
      .toUpperCase();
    const dateRaw =
      pengumuman.TglPengumuman ??
      pengumuman.PublishDate ??
      pengumuman.publishedAt ??
      pengumuman.date ??
      Date.now();
    const publishedAt = new Date(String(dateRaw));
    if (Number.isNaN(publishedAt.getTime())) continue;

    const attachments =
      (r.attachments as unknown[]) ?? (r.Attachments as unknown[]) ?? [];
    const firstAtt = attachments[0] as Record<string, unknown> | undefined;
    const attPath = firstAtt
      ? String(
          firstAtt.FullSavePath ??
            firstAtt.SavedPath ??
            firstAtt.url ??
            firstAtt.Url ??
            "",
        )
      : "";
    const idHint = String(
      pengumuman.Id ?? pengumuman.id ?? pengumuman.NoPengumuman ?? title,
    );
    const url =
      attPath && attPath.startsWith("http")
        ? attPath
        : attPath
          ? `https://www.idx.co.id${attPath.startsWith("/") ? "" : "/"}${attPath}`
          : `https://www.idx.co.id/id/berita/detail/?id=${encodeURIComponent(idHint)}`;

    out.push({
      title,
      url,
      publishedAt,
      ticker: ticker || undefined,
      summary: ticker
        ? `Official IDX disclosure for ${ticker}.`
        : "Official IDX corporate announcement.",
    });
  }
  return out.slice(0, 40);
}

export async function ingestIdxAnnouncements(
  db: Db,
): Promise<AdapterResult> {
  const result: AdapterResult = { ok: 0, fail: 0, errors: [] };
  const [row] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, SOURCE_ID))
    .limit(1);
  if (withinCadence(row?.lastSuccessAt, IDX_CADENCE_MS)) {
    return result;
  }

  let lastError = "No endpoint succeeded";
  for (const endpoint of IDX_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          "User-Agent":
            "FinPulse/0.4 (+https://localhost; research aggregator)",
          Accept: "application/json, text/plain, */*",
          Referer: "https://www.idx.co.id/id",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (res.status === 403 || res.status === 503) {
        lastError = `IDX circuit ${res.status} at ${endpoint}`;
        continue;
      }
      if (!res.ok) {
        lastError = `IDX HTTP ${res.status}`;
        continue;
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        lastError = "IDX returned HTML (bot wall)";
        continue;
      }
      const payload = await res.json();
      const items = parseIdxAnnouncements(payload);
      if (items.length === 0) {
        lastError = "IDX JSON parsed but empty";
        continue;
      }

      const rows = items.map((item) => {
        const tickers = item.ticker
          ? Array.from(
              new Set([
                item.ticker,
                ...extractTickers(`${item.title} ${item.ticker}`),
              ]),
            )
          : extractTickers(item.title);
        const url = normalizeArticleUrl(item.url);
        const id = slugId(SOURCE_ID, item.title, url);
        const rawHash = createHash("sha256")
          .update(`${item.title}|${url}`)
          .digest("hex")
          .slice(0, 32);
        const summaryBase =
          item.summary ?? "Official IDX corporate announcement.";
        // Keep ticker in text so instrument matching does not rely on
        // stored tickers alone (those can include stale false positives).
        const summary = item.ticker
          ? `${item.ticker} — ${summaryBase}`
          : summaryBase;
        return {
          id,
          sourceId: SOURCE_ID,
          title: item.title,
          summary,
          url,
          publishedAt: item.publishedAt,
          scope: "finance" as const,
          category: "equities",
          market: "ID",
          language: "id",
          tickers,
          rawHash,
        };
      });
      if (rows.length > 0) {
        await db
          .insert(articles)
          .values(rows)
          .onConflictDoUpdate({
            target: articles.url,
            set: {
              title: sql`excluded.title`,
              summary: sql`excluded.summary`,
              publishedAt: sql`excluded.published_at`,
              tickers: sql`excluded.tickers`,
              rawHash: sql`excluded.raw_hash`,
              ingestedAt: new Date(),
            },
          });
      }
      await markSourceSuccess(db, SOURCE_ID);
      result.ok += 1;
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  result.fail += 1;
  result.errors.push({
    source: "IDX Announcements",
    message: lastError,
  });
  return result;
}
