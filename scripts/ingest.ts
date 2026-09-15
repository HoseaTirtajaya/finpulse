import "dotenv/config";
import { config } from "dotenv";
import { resolve } from "path";

// Prefer .env.local over .env so empty placeholders don't shadow real keys.
config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error("DATABASE_URL is required. Set it in .env.local");
    process.exit(1);
  }
  const { runIngest } = await import("../src/lib/ingest/run");
  console.log("Starting ingest…");
  const summary = await runIngest();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failCount > 0 && summary.okCount === 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
