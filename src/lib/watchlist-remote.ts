/**
 * Optional Upstash Redis watchlist sync for cross-device use.
 * When env vars are missing, callers should keep using localStorage.
 */
export async function fetchRemoteWatchlist(
  userKey = "default",
): Promise<string[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url}/get/finpulse:watchlist:${userKey}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: string | null };
  if (!data.result) return null;
  try {
    const parsed = JSON.parse(data.result) as string[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveRemoteWatchlist(
  symbols: string[],
  userKey = "default",
): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;

  const res = await fetch(`${url}/set/finpulse:watchlist:${userKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(symbols),
  });
  return res.ok;
}
