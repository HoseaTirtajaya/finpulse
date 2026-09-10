import type { TrendCluster } from "@/lib/types";

export function TrendingClusters({ clusters }: { clusters: TrendCluster[] }) {
  if (clusters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--fp-line)] bg-white/40 px-6 py-14 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
          No trending clusters yet
        </p>
        <p className="mt-2 text-sm text-[var(--fp-muted)]">
          Clusters appear when multiple outlets cover similar stories. Try again
          after feeds refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {clusters.map((c, index) => (
        <article
          key={c.id}
          className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-[var(--fp-muted)]">
                #{index + 1} · score {c.score}
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)] md:text-2xl">
                {c.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--fp-muted)]">
                {c.sourceCount} outlet{c.sourceCount === 1 ? "" : "s"} ·{" "}
                {c.mentionCount} related headline
                {c.mentionCount === 1 ? "" : "s"} · {c.sources.join(", ")}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 border-t border-[var(--fp-line)] pt-3">
            {c.headlines.map((h) => (
              <li key={`${h.source}-${h.title}`} className="text-sm">
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--fp-ink)] hover:text-[var(--fp-accent)]"
                >
                  <span className="text-[var(--fp-muted)]">{h.source}:</span>{" "}
                  {h.title}
                </a>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
