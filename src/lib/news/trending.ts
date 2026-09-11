import type { NewsItem, TrendCluster, TrendClusterLanes } from "@/lib/types";
import { jaccard, significantTokens } from "@/lib/news/sources/shared";

const CLUSTER_THRESHOLD = 0.28;
const MIN_SOURCE_COUNT = 2;

function recencyWeight(publishedAt: string, now: number): number {
  const ageHours =
    (now - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 6) return 1.4;
  if (ageHours <= 24) return 1;
  if (ageHours <= 48) return 0.6;
  return 0.3;
}

function isIndonesiaItem(item: NewsItem): boolean {
  if (item.market === "ID") return true;
  if (item.market === "US" || item.market === "global") return false;
  return item.language === "id";
}

/**
 * Cluster near-duplicate headlines within one region and rank by
 * unique-source count × recency. Requires 2+ outlets to qualify as trending.
 * Seed tokens stay fixed — new titles are compared to the seed only (no bag drift).
 */
function clusterLane(items: NewsItem[], now: number): TrendCluster[] {
  const clusters: {
    seedTokens: Set<string>;
    members: NewsItem[];
  }[] = [];

  for (const item of items) {
    const tokens = significantTokens(item.title);
    if (tokens.size < 2) continue;

    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < clusters.length; i++) {
      const score = jaccard(tokens, clusters[i].seedTokens);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestScore >= CLUSTER_THRESHOLD) {
      clusters[bestIdx].members.push(item);
    } else {
      clusters.push({ seedTokens: tokens, members: [item] });
    }
  }

  return clusters
    .map((c, idx) => {
      const sources = Array.from(new Set(c.members.map((m) => m.source)));
      const newest = c.members.reduce((a, b) =>
        new Date(a.publishedAt) > new Date(b.publishedAt) ? a : b,
      );
      const avgRecency =
        c.members.reduce(
          (sum, m) => sum + recencyWeight(m.publishedAt, now),
          0,
        ) / c.members.length;
      const score = Math.round(sources.length * avgRecency * 25);

      return {
        id: `tc${idx}-${slugish(newest.title)}`,
        title: newest.title,
        score,
        sourceCount: sources.length,
        sources,
        headlines: c.members.slice(0, 6).map((m) => ({
          title: m.title,
          source: m.source,
          url: m.url,
          publishedAt: m.publishedAt,
        })),
        mentionCount: c.members.length,
      } satisfies TrendCluster;
    })
    .filter((c) => c.sourceCount >= MIN_SOURCE_COUNT)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.sourceCount - a.sourceCount ||
        b.mentionCount - a.mentionCount,
    )
    .slice(0, 20);
}

/**
 * Partition into World vs Indonesia lanes, cluster independently.
 * Never ranks the two regions against each other.
 * Pass `nowMs` from the request path so builds do not call Date.now() at prerender.
 */
export function buildTrendClusters(
  items: NewsItem[],
  nowMs: number,
): TrendClusterLanes {
  const world: NewsItem[] = [];
  const indonesia: NewsItem[] = [];

  for (const item of items) {
    if (isIndonesiaItem(item)) indonesia.push(item);
    else world.push(item);
  }

  return {
    world: clusterLane(world, nowMs),
    indonesia: clusterLane(indonesia, nowMs),
  };
}

function slugish(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
}
