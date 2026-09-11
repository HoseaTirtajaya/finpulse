/** Run async tasks with a fixed concurrency limit. */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/**
 * Normalize article URLs for dedup: lowercase host, strip utm_*, trailing slash,
 * hash fragments, and common tracking params.
 */
export function normalizeArticleUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "mc_cid",
      "mc_eid",
    ]);
    const kept = [...u.searchParams.entries()].filter(
      ([k]) => !drop.has(k.toLowerCase()),
    );
    u.search = "";
    for (const [k, v] of kept.sort(([a], [b]) => a.localeCompare(b))) {
      u.searchParams.append(k, v);
    }
    let path = u.pathname.replace(/\/+$/, "") || "/";
    u.pathname = path;
    return u.toString();
  } catch {
    return raw.trim().replace(/\/+$/, "").toLowerCase();
  }
}

/** Dedup key: prefer normalized URL; fall back to title prefix. */
export function articleDedupKey(url: string, title: string): string {
  const n = normalizeArticleUrl(url);
  if (n && n !== "#" && n.length > 8) return `url:${n}`;
  return `title:${title.toLowerCase().slice(0, 80)}`;
}
