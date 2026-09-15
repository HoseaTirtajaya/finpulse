import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { verifyBriefPassword } from "@/lib/ai/brief-auth";
import {
  normalizeImpact,
  parseBiquoteCalendar,
  parseFinnhubCalendar,
} from "@/lib/ingest/finnhub-calendar";
import { articleDedupKey, normalizeArticleUrl } from "@/lib/ingest/helpers";
import { parseIdxAnnouncements } from "@/lib/ingest/idx";
import { withinCadence } from "@/lib/ingest/sources";
import { authorizeIngestRequest } from "@/lib/ingest/auth";
import {
  countryCodesForInstrument,
  fxLegsFromSymbol,
} from "@/lib/macro/events-for-instrument";
import type { Instrument } from "@/lib/types";

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

describe("Finnhub calendar parser", () => {
  it("parses sample JSON events", () => {
    const payload = JSON.parse(
      readFileSync(
        resolve(__dirname, "fixtures/finnhub-calendar-sample.json"),
        "utf8",
      ),
    );
    const events = parseFinnhubCalendar(payload);
    expect(events.length).toBe(3);
    expect(events[0].title).toBe("CPI m/m");
    expect(events[0].country).toBe("US");
    expect(events[0].impact).toBe("high");
    expect(events[0].forecast).toBe("0.2%");
    expect(events[0].previous).toBe("0.1%");
    expect(events[1].impact).toBe("medium");
    expect(events[1].country).toBe("EU");
    expect(events[2].impact).toBe("holiday");
  });

  it("normalizes impact strings", () => {
    expect(normalizeImpact("High")).toBe("high");
    expect(normalizeImpact("medium")).toBe("medium");
    expect(normalizeImpact("3")).toBe("high");
    expect(normalizeImpact("low")).toBe("low");
  });
});

describe("Biquote calendar parser", () => {
  it("parses sample JSON events", () => {
    const payload = JSON.parse(
      readFileSync(
        resolve(__dirname, "fixtures/biquote-calendar-sample.json"),
        "utf8",
      ),
    );
    const events = parseBiquoteCalendar(payload);
    expect(events.length).toBe(2);
    expect(events[0].title).toBe("CPI m/m");
    expect(events[0].country).toBe("USD");
    expect(events[0].impact).toBe("high");
    expect(events[0].forecast).toBe("0.2%");
    expect(events[1].country).toBe("EUR");
    expect(events[1].impact).toBe("medium");
    expect(events[1].sector).toBe("prices");
    expect(events[1].sourceUrl).toContain("europa.eu");
  });
});

describe("instrument country matching", () => {
  const base: Omit<Instrument, "symbol" | "name" | "type" | "currency" | "market"> =
    {
      sector: "Test",
      description: "test",
      yahooSymbol: "TEST",
      tags: [],
    };

  it("extracts FX legs", () => {
    expect(fxLegsFromSymbol("EURUSD")).toEqual(["EUR", "USD"]);
    expect(fxLegsFromSymbol("USDIDR")).toEqual(["USD", "IDR"]);
  });

  it("matches both FX legs for EURUSD", () => {
    const codes = countryCodesForInstrument({
      ...base,
      symbol: "EURUSD",
      name: "Euro / US Dollar",
      type: "fx",
      market: "global",
      currency: "USD",
    });
    expect(codes).toEqual(expect.arrayContaining(["EUR", "USD", "US", "EU"]));
  });

  it("uses USD aliases for crypto", () => {
    const codes = countryCodesForInstrument({
      ...base,
      symbol: "BTC",
      name: "Bitcoin",
      type: "crypto",
      market: "global",
      currency: "USD",
    });
    expect(codes).toEqual(expect.arrayContaining(["USD", "US"]));
  });
});

describe("AI brief password gate", () => {
  it("rejects when env password unset", () => {
    const prev = process.env.AI_BRIEF_PASSWORD;
    delete process.env.AI_BRIEF_PASSWORD;
    expect(verifyBriefPassword("anything")).toBe(false);
    if (prev !== undefined) process.env.AI_BRIEF_PASSWORD = prev;
  });

  it("rejects wrong password", () => {
    const prev = process.env.AI_BRIEF_PASSWORD;
    process.env.AI_BRIEF_PASSWORD = "correct-horse";
    expect(verifyBriefPassword("wrong")).toBe(false);
    expect(verifyBriefPassword("")).toBe(false);
    expect(verifyBriefPassword(undefined)).toBe(false);
    if (prev !== undefined) process.env.AI_BRIEF_PASSWORD = prev;
    else delete process.env.AI_BRIEF_PASSWORD;
  });

  it("accepts matching password", () => {
    const prev = process.env.AI_BRIEF_PASSWORD;
    process.env.AI_BRIEF_PASSWORD = "correct-horse";
    expect(verifyBriefPassword("correct-horse")).toBe(true);
    if (prev !== undefined) process.env.AI_BRIEF_PASSWORD = prev;
    else delete process.env.AI_BRIEF_PASSWORD;
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
