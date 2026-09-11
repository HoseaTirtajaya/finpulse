import { mapPool } from "@/lib/ingest/helpers";

const DEFAULT_CONCURRENCY = 6;

type FetchRetryOptions = {
  retries?: number;
  timeoutMs?: number;
  concurrencyKey?: string;
};

const inFlight = new Map<string, Promise<Response | null>>();

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch with timeout, jittered backoff on 429/5xx, and optional in-flight dedupe.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options: FetchRetryOptions = {},
): Promise<Response | null> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 8000;
  const dedupeKey = options.concurrencyKey ?? url;

  const existing = inFlight.get(dedupeKey);
  if (existing) return existing;

  const run = (async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          ...init,
          signal: init.signal ?? AbortSignal.timeout(timeoutMs),
        });
        if (res.status === 429 || res.status >= 500) {
          const retryAfter = Number(res.headers.get("retry-after") || 0);
          const backoff =
            retryAfter > 0
              ? retryAfter * 1000
              : Math.min(8000, 400 * 2 ** attempt) +
                Math.floor(Math.random() * 200);
          if (attempt < retries) {
            await sleep(backoff);
            continue;
          }
          return null;
        }
        if (!res.ok) return null;
        return res;
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await sleep(300 * 2 ** attempt + Math.floor(Math.random() * 150));
          continue;
        }
      }
    }
    if (lastError) {
      // swallow — callers treat null as miss
    }
    return null;
  })();

  inFlight.set(dedupeKey, run);
  try {
    return await run;
  } finally {
    inFlight.delete(dedupeKey);
  }
}

/** Map async work over items with a concurrency cap. */
export async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = DEFAULT_CONCURRENCY,
): Promise<R[]> {
  return mapPool(items, concurrency, fn);
}
