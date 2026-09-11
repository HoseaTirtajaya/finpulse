-- FinPulse ingest store (Phase 1)
CREATE TABLE IF NOT EXISTS "sources" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "scope" text NOT NULL,
  "market" text,
  "language" text,
  "kind" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "last_success_at" timestamp with time zone,
  "category" text
);

CREATE TABLE IF NOT EXISTS "articles" (
  "id" text PRIMARY KEY NOT NULL,
  "source_id" text NOT NULL,
  "title" text NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "url" text NOT NULL,
  "published_at" timestamp with time zone NOT NULL,
  "scope" text NOT NULL,
  "category" text DEFAULT 'markets' NOT NULL,
  "market" text,
  "language" text,
  "tickers" text[] DEFAULT '{}' NOT NULL,
  "raw_hash" text,
  "ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "macro_events" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "country" text NOT NULL,
  "impact" text DEFAULT 'low' NOT NULL,
  "event_at" timestamp with time zone NOT NULL,
  "actual" text,
  "forecast" text,
  "previous" text,
  "ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ingest_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "finished_at" timestamp with time zone,
  "ok_count" integer DEFAULT 0 NOT NULL,
  "fail_count" integer DEFAULT 0 NOT NULL,
  "errors" jsonb DEFAULT '[]'::jsonb NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_sources_id_fk"
    FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "articles_url_uidx" ON "articles" USING btree ("url");
CREATE INDEX IF NOT EXISTS "articles_published_idx" ON "articles" USING btree ("published_at");
CREATE INDEX IF NOT EXISTS "articles_scope_market_idx" ON "articles" USING btree ("scope","market");
CREATE UNIQUE INDEX IF NOT EXISTS "macro_events_natural_uidx" ON "macro_events" USING btree ("title","event_at","country");
CREATE INDEX IF NOT EXISTS "macro_events_at_idx" ON "macro_events" USING btree ("event_at");
