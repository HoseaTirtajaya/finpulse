"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { MarketFilter, NewsScope } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCOPES: { id: NewsScope; label: string; href: string }[] = [
  { id: "finance", label: "Finance", href: "/" },
  { id: "general", label: "General", href: "/general" },
  { id: "trending", label: "Trending", href: "/trending" },
];

const FINANCE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "markets", label: "Markets" },
  { id: "equities", label: "Equities" },
  { id: "macro", label: "Macro" },
  { id: "crypto", label: "Crypto" },
];

const GENERAL_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "world", label: "World" },
  { id: "tech", label: "Tech" },
  { id: "politics", label: "Politics" },
  { id: "sports", label: "Sports" },
  { id: "culture", label: "Culture" },
];

const FINANCE_MARKETS: { id: MarketFilter; label: string }[] = [
  { id: "all", label: "All markets" },
  { id: "US", label: "US" },
  { id: "ID", label: "IDX" },
];

const GENERAL_REGIONS: { id: MarketFilter; label: string }[] = [
  { id: "world", label: "World" },
  { id: "ID", label: "Indonesia" },
  { id: "all", label: "All" },
];

function scopeFromPath(pathname: string): NewsScope {
  if (pathname.startsWith("/general")) return "general";
  if (pathname.startsWith("/trending")) return "trending";
  return "finance";
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = scopeFromPath(pathname);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const activeCategory = searchParams.get("category") || "all";
  const defaultMarket: MarketFilter = scope === "general" ? "world" : "all";
  const activeMarket =
    (searchParams.get("market") as MarketFilter) || defaultMarket;
  const basePath =
    scope === "general" ? "/general" : scope === "trending" ? "/trending" : "/";
  const categories =
    scope === "general"
      ? GENERAL_CATEGORIES
      : scope === "finance"
        ? FINANCE_CATEGORIES
        : [];
  const regionChips =
    scope === "finance"
      ? FINANCE_MARKETS
      : scope === "general"
        ? GENERAL_REGIONS
        : [];

  function hrefFor(opts: {
    category?: string;
    market?: MarketFilter;
    q?: string;
  }) {
    const params = new URLSearchParams();
    const category = opts.category ?? activeCategory;
    const market = opts.market ?? activeMarket;
    const query = opts.q ?? q;
    if (category && category !== "all") params.set("category", category);
    if (scope === "finance" && market && market !== "all") {
      params.set("market", market);
    }
    // General defaults to world — omit param when world so URLs stay clean.
    if (scope === "general" && market && market !== "world") {
      params.set("market", market);
    }
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <header className="relative z-20 border-b border-[var(--fp-line)]/80 bg-[var(--fp-paper)]/75 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--fp-ink)] md:text-3xl">
            FinPulse
          </span>
          <span className="hidden text-xs tracking-[0.2em] text-[var(--fp-muted)] uppercase sm:inline">
            Multi-scope news desk
          </span>
        </Link>
        <nav className="flex items-center gap-1 rounded-md border border-[var(--fp-line)] bg-white/50 p-1 text-sm">
          {SCOPES.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className={cn(
                "rounded-sm px-3 py-1.5 transition",
                scope === s.id
                  ? "bg-[var(--fp-ink)] text-[var(--fp-paper)]"
                  : "text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/crypto"
            className={cn(
              "transition hover:text-[var(--fp-accent)]",
              pathname.startsWith("/crypto") && "text-[var(--fp-accent)]",
            )}
          >
            Crypto
          </Link>
          {scope === "finance" && (
            <>
              <Link
                href="/#watchlist"
                className="transition hover:text-[var(--fp-accent)]"
              >
                Watchlist
              </Link>
              <Link
                href="/recommendations"
                className={cn(
                  "transition hover:text-[var(--fp-accent)]",
                  pathname.startsWith("/recommendations") &&
                    "text-[var(--fp-accent)]",
                )}
              >
                Ideas
              </Link>
            </>
          )}
          <Link
            href={`${basePath}#brief`}
            className="transition hover:text-[var(--fp-accent)]"
          >
            AI brief
          </Link>
        </nav>
      </div>

      {(scope === "finance" || scope === "general") && (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pb-4 md:px-6">
          <div className="flex flex-wrap items-center gap-3">
            {regionChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {regionChips.map((m) => (
                  <Link
                    key={m.id}
                    href={hrefFor({ market: m.id })}
                    scroll={false}
                    className={cn(
                      "rounded-sm px-2.5 py-1 text-xs transition",
                      activeMarket === m.id
                        ? "bg-[var(--fp-accent)] text-white"
                        : "bg-white/50 text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
                    )}
                  >
                    {m.label}
                  </Link>
                ))}
              </div>
            )}
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="Categories"
            >
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={hrefFor({ category: c.id })}
                  scroll={false}
                  aria-current={activeCategory === c.id ? "page" : undefined}
                  className={cn(
                    "rounded-sm px-3 py-1.5 text-sm transition",
                    activeCategory === c.id
                      ? "bg-[var(--fp-ink)] text-[var(--fp-paper)]"
                      : "bg-white/50 text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
                  )}
                >
                  {c.label}
                </Link>
              ))}
            </div>
            <form
              className="ml-auto flex w-full gap-2 md:max-w-md md:w-auto"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(() => {
                  router.push(hrefFor({ q }));
                });
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--fp-muted)]" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search headlines, tickers, sources"
                  className="border-[var(--fp-line)] bg-white/70 pl-9"
                />
              </div>
              <Button
                type="submit"
                disabled={pending}
                variant="secondary"
                className="border border-[var(--fp-line)] bg-white/70"
              >
                Search
              </Button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
