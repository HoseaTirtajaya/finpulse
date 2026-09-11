import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  scope: text("scope").notNull(), // finance | general | macro
  market: text("market"), // US | ID | global
  language: text("language"), // en | id
  kind: text("kind").notNull(), // rss | ff_calendar | idx_announcement
  enabled: boolean("enabled").notNull().default(true),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  category: text("category"),
});

export const articles = pgTable(
  "articles",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    url: text("url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    scope: text("scope").notNull(), // finance | general
    category: text("category").notNull().default("markets"),
    market: text("market"),
    language: text("language"),
    tickers: text("tickers").array().notNull().default([]),
    rawHash: text("raw_hash"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("articles_url_uidx").on(t.url),
    index("articles_published_idx").on(t.publishedAt),
    index("articles_scope_market_idx").on(t.scope, t.market),
    index("articles_category_idx").on(t.category),
    index("articles_scope_published_idx").on(t.scope, t.publishedAt),
    index("articles_tickers_gin_idx").using("gin", t.tickers),
    index("articles_fts_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${t.title}, '') || ' ' || coalesce(${t.summary}, ''))`,
    ),
  ],
);

export const macroEvents = pgTable(
  "macro_events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    country: text("country").notNull(),
    impact: text("impact").notNull().default("low"),
    eventAt: timestamp("event_at", { withTimezone: true }).notNull(),
    actual: text("actual"),
    forecast: text("forecast"),
    previous: text("previous"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("macro_events_natural_uidx").on(t.title, t.eventAt, t.country),
    index("macro_events_at_idx").on(t.eventAt),
  ],
);

export const ingestRuns = pgTable("ingest_runs", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  okCount: integer("ok_count").notNull().default(0),
  failCount: integer("fail_count").notNull().default(0),
  errors: jsonb("errors").$type<unknown[]>().notNull().default([]),
});

/** Catalog of tradable instruments (seeded from src/lib/instruments.ts). */
export const instruments = pgTable(
  "instruments",
  {
    symbol: text("symbol").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(), // equity | etf | index | crypto | fx
    sector: text("sector").notNull().default(""),
    description: text("description").notNull().default(""),
    market: text("market").notNull(), // US | EU | ID | Asia | global
    currency: text("currency").notNull().default("USD"),
    yahooSymbol: text("yahoo_symbol"),
    coingeckoId: text("coingecko_id"),
    tags: text("tags").array().notNull().default([]),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("instruments_type_idx").on(t.type),
    index("instruments_market_idx").on(t.market),
  ],
);

export const instrumentAliases = pgTable(
  "instrument_aliases",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => instruments.symbol, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.symbol, t.alias] }),
    uniqueIndex("instrument_aliases_alias_uidx").on(t.alias),
  ],
);

/** Daily OHLCV bars — backfilled once, topped up by market ingest. */
export const dailyBars = pgTable(
  "daily_bars",
  {
    symbol: text("symbol").notNull(),
    barDate: date("bar_date").notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    volume: doublePrecision("volume"),
  },
  (t) => [
    primaryKey({ columns: [t.symbol, t.barDate] }),
    index("daily_bars_symbol_date_idx").on(t.symbol, t.barDate),
  ],
);

/** Article ↔ instrument links resolved once at ingest. */
export const articleInstruments = pgTable(
  "article_instruments",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 })
      .notNull()
      .default("1"),
  },
  (t) => [
    primaryKey({ columns: [t.articleId, t.symbol] }),
    index("article_instruments_symbol_idx").on(t.symbol),
  ],
);

export const instrumentFundamentals = pgTable("instrument_fundamentals", {
  symbol: text("symbol")
    .primaryKey()
    .references(() => instruments.symbol, { onDelete: "cascade" }),
  marketCap: doublePrecision("market_cap"),
  peRatio: doublePrecision("pe_ratio"),
  eps: doublePrecision("eps"),
  dividendYield: doublePrecision("dividend_yield"),
  sector: text("sector"),
  asOf: timestamp("as_of", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rankingSnapshots = pgTable(
  "ranking_snapshots",
  {
    id: text("id").primaryKey(),
    symbol: text("symbol").notNull(),
    scoredAt: timestamp("scored_at", { withTimezone: true }).notNull(),
    score: doublePrecision("score").notNull(),
    action: text("action").notNull(),
    breakdown: jsonb("breakdown").$type<Record<string, number>>().notNull(),
    market: text("market"),
  },
  (t) => [
    index("ranking_snapshots_symbol_scored_idx").on(t.symbol, t.scoredAt),
    index("ranking_snapshots_scored_idx").on(t.scoredAt),
  ],
);

/** Cached AI research briefs keyed by symbol + headline hash. */
export const aiBriefs = pgTable(
  "ai_briefs",
  {
    id: text("id").primaryKey(),
    symbol: text("symbol"),
    scope: text("scope"),
    headlineHash: text("headline_hash").notNull(),
    brief: jsonb("brief").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ai_briefs_symbol_hash_uidx").on(t.symbol, t.headlineHash),
    index("ai_briefs_created_idx").on(t.createdAt),
  ],
);

export type SourceRow = typeof sources.$inferSelect;
export type ArticleRow = typeof articles.$inferSelect;
export type MacroEventRow = typeof macroEvents.$inferSelect;
export type InstrumentRow = typeof instruments.$inferSelect;
export type DailyBarRow = typeof dailyBars.$inferSelect;
