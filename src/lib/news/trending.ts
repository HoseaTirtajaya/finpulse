import type { NewsItem, TrendCluster } from "@/lib/types";
import { jaccard, significantTokens } from "@/lib/news/sources/shared";

const CLUSTER_THRESHOLD = 0.35;

function recencyWeight(publishedAt: string, now: number): number {
  const ageHours =
    (now - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 6) return 1.4;
  if (ageHours <= 24) return 1;
  if (ageHours <= 48) return 0.6;
  return 0.3;
}

/**
 * Cluster near-duplicate headlines across outlets and rank by
 * unique-source count × recency (mention velocity proxy).
 */
export function buildTrendClusters(items: NewsItem[]): TrendCluster[] {
  const now = Date.now();
  const clusters: {
    tokens: Set<string>;
    members: NewsItem[];
  }[] = [];

  for (const item of items) {
    const tokens = significantTokens(item.title);
    if (tokens.size < 2) continue;

    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < clusters.length; i++) {
      const score = jaccard(tokens, clusters[i].tokens);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && bestScore >= CLUSTER_THRESHOLD) {
      clusters[bestIdx].members.push(item);
      for (const t of tokens) clusters[bestIdx].tokens.add(t);
    } else {
      clusters.push({ tokens, members: [item] });
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
    .filter((c) => c.sourceCount >= 1 && c.mentionCount >= 1)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.sourceCount - a.sourceCount ||
        b.mentionCount - a.mentionCount,
    )
    .slice(0, 20);
}

function slugish(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 12);
}
