"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NewsItem } from "@/lib/types";

export function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const when = formatDistanceToNow(new Date(item.publishedAt), {
    addSuffix: true,
  });

  return (
    <article
      className="news-row group border-b border-[var(--fp-line)] py-5 first:pt-0 last:border-0"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs tracking-wide text-[var(--fp-muted)] uppercase">
        <span>{item.source}</span>
        <span aria-hidden>·</span>
        <time dateTime={item.publishedAt}>{when}</time>
        <Badge
          variant="secondary"
          className="rounded-sm bg-[var(--fp-chip)] text-[var(--fp-ink)] capitalize"
        >
          {item.category}
        </Badge>
      </div>
      <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl leading-snug text-[var(--fp-ink)] transition-colors group-hover:text-[var(--fp-accent)] md:text-2xl">
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          {item.title}
        </a>
      </h3>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[var(--fp-muted)]">
        {item.summary}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {item.tickers.map((t) => (
          <Link
            key={t}
            href={`/instrument/${encodeURIComponent(t)}`}
            className="rounded-sm border border-[var(--fp-line)] bg-white/50 px-2 py-0.5 font-mono text-xs text-[var(--fp-ink)] transition hover:border-[var(--fp-accent)] hover:text-[var(--fp-accent)]"
          >
            {t}
          </Link>
        ))}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-sm text-[var(--fp-accent)] opacity-0 transition group-hover:opacity-100"
        >
          Read source <ExternalLink className="size-3.5" />
        </a>
      </div>
    </article>
  );
}
