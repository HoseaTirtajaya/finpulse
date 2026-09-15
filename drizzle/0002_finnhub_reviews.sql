-- Finnhub calendar source + AI instrument reviews
-- Run via: npm run db:push  (or apply manually)

ALTER TABLE "macro_events"
  ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'finnhub' NOT NULL;

CREATE TABLE IF NOT EXISTS "instrument_reviews" (
  "id" text PRIMARY KEY NOT NULL,
  "instrument" text NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "stance" text,
  "confidence" text,
  "summary" text NOT NULL,
  "context_event_ids" jsonb,
  "model" text,
  "payload" jsonb
);

CREATE INDEX IF NOT EXISTS "instrument_reviews_instrument_generated_idx"
  ON "instrument_reviews" USING btree ("instrument", "generated_at");
