-- Date impact analyzer cache
-- Run via: npm run db:push  (or apply manually)

CREATE TABLE IF NOT EXISTS "date_impacts" (
  "id" text PRIMARY KEY NOT NULL,
  "event_date" text NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "market_lean" text,
  "confidence" text,
  "summary" text NOT NULL,
  "context_event_ids" jsonb,
  "model" text,
  "payload" jsonb
);

CREATE INDEX IF NOT EXISTS "date_impacts_event_date_generated_idx"
  ON "date_impacts" USING btree ("event_date", "generated_at");
