-- FinPulse Phase 2 data foundation
-- Run via: npm run db:push  (or apply manually)

CREATE TABLE IF NOT EXISTS "instruments" (
  "symbol" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "sector" text DEFAULT '' NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "market" text NOT NULL,
  "currency" text DEFAULT 'USD' NOT NULL,
  "yahoo_symbol" text,
  "coingecko_id" text,
  "tags" text[] DEFAULT '{}' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "instruments_type_idx" ON "instruments" USING btree ("type");
CREATE INDEX IF NOT EXISTS "instruments_market_idx" ON "instruments" USING btree ("market");

CREATE TABLE IF NOT EXISTS "instrument_aliases" (
  "symbol" text NOT NULL,
  "alias" text NOT NULL,
  CONSTRAINT "instrument_aliases_symbol_instruments_symbol_fk"
    FOREIGN KEY ("symbol") REFERENCES "public"."instruments"("symbol") ON DELETE cascade,
  CONSTRAINT "instrument_aliases_pkey" PRIMARY KEY ("symbol", "alias")
);

CREATE UNIQUE INDEX IF NOT EXISTS "instrument_aliases_alias_uidx" ON "instrument_aliases" USING btree ("alias");

CREATE TABLE IF NOT EXISTS "daily_bars" (
  "symbol" text NOT NULL,
  "bar_date" date NOT NULL,
  "open" double precision NOT NULL,
  "high" double precision NOT NULL,
  "low" double precision NOT NULL,
  "close" double precision NOT NULL,
  "volume" double precision,
  CONSTRAINT "daily_bars_pkey" PRIMARY KEY ("symbol", "bar_date")
);

CREATE INDEX IF NOT EXISTS "daily_bars_symbol_date_idx" ON "daily_bars" USING btree ("symbol", "bar_date");

CREATE TABLE IF NOT EXISTS "article_instruments" (
  "article_id" text NOT NULL,
  "symbol" text NOT NULL,
  "confidence" numeric(4, 3) DEFAULT '1' NOT NULL,
  CONSTRAINT "article_instruments_article_id_articles_id_fk"
    FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade,
  CONSTRAINT "article_instruments_pkey" PRIMARY KEY ("article_id", "symbol")
);

CREATE INDEX IF NOT EXISTS "article_instruments_symbol_idx" ON "article_instruments" USING btree ("symbol");

CREATE TABLE IF NOT EXISTS "instrument_fundamentals" (
  "symbol" text PRIMARY KEY NOT NULL,
  "market_cap" double precision,
  "pe_ratio" double precision,
  "eps" double precision,
  "dividend_yield" double precision,
  "sector" text,
  "as_of" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "instrument_fundamentals_symbol_instruments_symbol_fk"
    FOREIGN KEY ("symbol") REFERENCES "public"."instruments"("symbol") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "ranking_snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "symbol" text NOT NULL,
  "scored_at" timestamp with time zone NOT NULL,
  "score" double precision NOT NULL,
  "action" text NOT NULL,
  "breakdown" jsonb NOT NULL,
  "market" text
);

CREATE INDEX IF NOT EXISTS "ranking_snapshots_symbol_scored_idx" ON "ranking_snapshots" USING btree ("symbol", "scored_at");
CREATE INDEX IF NOT EXISTS "ranking_snapshots_scored_idx" ON "ranking_snapshots" USING btree ("scored_at");

CREATE TABLE IF NOT EXISTS "ai_briefs" (
  "id" text PRIMARY KEY NOT NULL,
  "symbol" text,
  "scope" text,
  "headline_hash" text NOT NULL,
  "brief" jsonb NOT NULL,
  "model" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_briefs_symbol_hash_uidx" ON "ai_briefs" USING btree ("symbol", "headline_hash");
CREATE INDEX IF NOT EXISTS "ai_briefs_created_idx" ON "ai_briefs" USING btree ("created_at");

-- Article query indexes
CREATE INDEX IF NOT EXISTS "articles_category_idx" ON "articles" USING btree ("category");
CREATE INDEX IF NOT EXISTS "articles_scope_published_idx" ON "articles" USING btree ("scope", "published_at");
CREATE INDEX IF NOT EXISTS "articles_tickers_gin_idx" ON "articles" USING gin ("tickers");
CREATE INDEX IF NOT EXISTS "articles_fts_idx" ON "articles" USING gin (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, ''))
);
