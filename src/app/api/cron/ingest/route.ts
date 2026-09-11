import { NextRequest, NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { authorizeIngestRequest } from "@/lib/ingest/auth";
import { runIngest } from "@/lib/ingest/run";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const allowed = authorizeIngestRequest({
    authorization: request.headers.get("authorization"),
    cronSecret: process.env.CRON_SECRET,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }
  try {
    const summary = await runIngest();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("ingest failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
