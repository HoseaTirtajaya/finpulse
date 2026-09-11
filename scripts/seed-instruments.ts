import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";
import { sql } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required. Set it in .env.local");
    process.exit(1);
  }
  const { getDb } = await import("../src/lib/db");
  const { instruments, instrumentAliases } = await import(
    "../src/lib/db/schema"
  );
  const { INSTRUMENTS } = await import("../src/lib/instruments");

  const db = getDb();
  const rows = INSTRUMENTS.map((i) => ({
    symbol: i.symbol,
    name: i.name,
    type: i.type,
    sector: i.sector,
    description: i.description,
    market: i.market,
    currency: i.currency,
    yahooSymbol: i.yahooSymbol,
    coingeckoId: i.coingeckoId ?? null,
    tags: i.tags ?? [],
    enabled: true,
    updatedAt: new Date(),
  }));

  console.log(`Seeding ${rows.length} instruments…`);
  const CHUNK = 30;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db
      .insert(instruments)
      .values(chunk)
      .onConflictDoUpdate({
        target: instruments.symbol,
        set: {
          name: sql`excluded.name`,
          type: sql`excluded.type`,
          sector: sql`excluded.sector`,
          description: sql`excluded.description`,
          market: sql`excluded.market`,
          currency: sql`excluded.currency`,
          yahooSymbol: sql`excluded.yahoo_symbol`,
          coingeckoId: sql`excluded.coingecko_id`,
          tags: sql`excluded.tags`,
          enabled: sql`excluded.enabled`,
          updatedAt: new Date(),
        },
      });
  }

  const aliasRows: { symbol: string; alias: string }[] = [];
  for (const i of INSTRUMENTS) {
    for (const a of i.aliases ?? []) {
      const alias = a.trim();
      if (alias.length < 2) continue;
      aliasRows.push({ symbol: i.symbol, alias });
    }
  }

  if (aliasRows.length > 0) {
    console.log(`Seeding ${aliasRows.length} aliases…`);
    for (let i = 0; i < aliasRows.length; i += CHUNK) {
      const chunk = aliasRows.slice(i, i + CHUNK);
      await db
        .insert(instrumentAliases)
        .values(chunk)
        .onConflictDoNothing();
    }
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
