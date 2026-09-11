/** Shared auth check for cron ingest (testable without NextRequest). */
export function authorizeIngestRequest(opts: {
  authorization: string | null;
  cronSecret: string | undefined;
}): boolean {
  const secret = opts.cronSecret?.trim();
  if (!secret) return false;
  return opts.authorization === `Bearer ${secret}`;
}
