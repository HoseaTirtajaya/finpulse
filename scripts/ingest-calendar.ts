import { config } from "dotenv";
import { resolve } from "path";
import { and, asc, count, eq, gte, or } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { getDb } = await import("../src/lib/db");
  const { ensureSources } = await import("../src/lib/ingest/sources");
  const { ingestFinnhubCalendar } = await import(
    "../src/lib/ingest/finnhub-calendar"
  );
  const { macroEvents, sources } = await import("../src/lib/db/schema");
  const { queryMacroEvents } = await import("../src/lib/news/query-news");

  const db = getDb();
  await ensureSources(db);
  await db
    .update(sources)
    .set({ lastSuccessAt: null })
    .where(eq(sources.id, "finnhub-economic"));

  const result = await ingestFinnhubCalendar(db);
  console.log("ingest", JSON.stringify(result, null, 2));

  const [row] = await db
    .select({ n: count() })
    .from(macroEvents)
    .where(gte(macroEvents.eventAt, new Date()));
  console.log("upcoming_count", row?.n);

  const sample = await db
    .select({
      title: macroEvents.title,
      country: macroEvents.country,
      impact: macroEvents.impact,
      source: macroEvents.source,
      eventAt: macroEvents.eventAt,
    })
    .from(macroEvents)
    .where(
      and(
        gte(macroEvents.eventAt, new Date()),
        or(eq(macroEvents.impact, "high"), eq(macroEvents.impact, "medium")),
      ),
    )
    .orderBy(asc(macroEvents.eventAt))
    .limit(8);
  console.log("upcoming_high_med_sample", JSON.stringify(sample, null, 2));

  const rail = await queryMacroEvents({
    hoursAhead: 48,
    minImpact: "medium",
    limit: 10,
  });
  console.log("rail_count", rail.length);
  console.log("rail_sample", JSON.stringify(rail.slice(0, 5), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
