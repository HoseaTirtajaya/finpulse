-- Event metadata + per-event AI briefs
-- Run via: npm run db:push

ALTER TABLE "macro_events" ADD COLUMN IF NOT EXISTS "sector" text;
ALTER TABLE "macro_events" ADD COLUMN IF NOT EXISTS "event_type" text;
ALTER TABLE "macro_events" ADD COLUMN IF NOT EXISTS "source_url" text;

CREATE TABLE IF NOT EXISTS "event_briefs" (
  "id" text PRIMARY KEY NOT NULL,
  "event_id" text NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "summary" text NOT NULL,
  "key_points" jsonb,
  "market_notes" jsonb,
  "model" text,
  "payload" jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_briefs_event_id_uidx"
  ON "event_briefs" USING btree ("event_id");

CREATE INDEX IF NOT EXISTS "event_briefs_generated_idx"
  ON "event_briefs" USING btree ("generated_at");
