import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import {
  parseFfDateTime,
  parseForexFactoryCalendar,
} from "@/lib/ingest/forex-factory";
import { articleDedupKey, normalizeArticleUrl } from "@/lib/ingest/helpers";
import { parseIdxAnnouncements } from "@/lib/ingest/idx";
import { withinCadence } from "@/lib/ingest/sources";
import { authorizeIngestRequest } from "@/lib/ingest/auth";

describe("withinCadence", () => {
  it("returns false when never succeeded", () => {
    expect(withinCadence(null, 60_000)).toBe(false);
  });

  it("returns true when inside window", () => {
    expect(withinCadence(new Date(Date.now() - 1000), 60_000)).toBe(true);
  });

  it("returns false when outside window", () => {
    expect(withinCadence(new Date(Date.now() - 120_000), 60_000)).toBe(false);
  });
});

describe("Forex Factory calendar parser", () => {
  it("parses sample XML events", () => {
    const xml = readFileSync(
      resolve(__dirname, "fixtures/ff-calendar-sample.xml"),
      "utf8",
    );
    const events = parseForexFactoryCalendar(xml);
    expect(events.length).toBe(2);
    expect(events[0].title).toBe("CPI m/m");
    expect(events[0].country).toBe("USD");
    expect(events[0].impact).toBe("high");
    expect(events[0].forecast).toBe("0.2%");
    expect(events[1].impact).toBe("medium");
  });

  it("parses FF date/time", () => {
    const d = parseFfDateTime("09-12-2026", "8:30am");
    expect(d).toBeTruthy();
    expect(d!.getUTCFullYear()).toBe(2026);
    expect(d!.getUTCMonth()).toBe(8);
  });
});

describe("IDX announcements parser", () => {
  it("normalizes sample JSON", () => {
    const payload = JSON.parse(
      readFileSync(
        resolve(__dirname, "fixtures/idx-announcements-sample.json"),
        "utf8",
      ),
    );
    const items = parseIdxAnnouncements(payload);
    expect(items.length).toBe(2);
    expect(items[0].ticker).toBe("BBCA");
    expect(items[0].title).toContain("Laporan Keuangan");
    expect(items[0].url).toContain("idx.co.id");
    expect(items[1].ticker).toBe("BBRI");
  });
});

describe("cron ingest auth", () => {
  it("rejects missing secret", () => {
    expect(
      authorizeIngestRequest({
        authorization: "Bearer test",
        cronSecret: undefined,
      }),
    ).toBe(false);
  });

  it("rejects wrong bearer", () => {
    expect(
      authorizeIngestRequest({
        authorization: "Bearer wrong",
        cronSecret: "secret",
      }),
    ).toBe(false);
  });

  it("accepts matching bearer", () => {
    expect(
      authorizeIngestRequest({
        authorization: "Bearer secret",
        cronSecret: "secret",
      }),
    ).toBe(true);
  });
});

describe("URL normalize / dedup", () => {
  it("strips utm params and trailing slash", () => {
    expect(
      normalizeArticleUrl(
        "https://Example.com/news/story/?utm_source=x&utm_medium=y",
      ),
    ).toBe("https://example.com/news/story");
  });

  it("dedups by normalized URL over title", () => {
    const a = articleDedupKey(
      "https://ex.com/a?utm_source=twitter",
      "Title A",
    );
    const b = articleDedupKey("https://ex.com/a/", "Different title");
    expect(a).toBe(b);
  });
});
