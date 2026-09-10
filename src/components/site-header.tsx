"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { NewsCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "markets", label: "Markets" },
  { id: "equities", label: "Equities" },
  { id: "macro", label: "Macro" },
  { id: "crypto", label: "Crypto" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const active = (searchParams.get("category") as NewsCategory) || "all";

  function searchHref(query: string) {
    const params = new URLSearchParams();
    if (active !== "all") params.set("category", active);
    if (query.trim()) params.set("q", query.trim());
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function categoryHref(category: NewsCategory) {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    const currentQ = searchParams.get("q");
    if (currentQ) params.set("q", currentQ);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <header className="relative z-20 border-b border-[var(--fp-line)]/80 bg-[var(--fp-paper)]/75 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--fp-ink)] md:text-3xl">
            FinPulse
          </span>
          <span className="hidden text-xs tracking-[0.2em] text-[var(--fp-muted)] uppercase sm:inline">
            Financial intelligence
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className={cn(
              "transition hover:text-[var(--fp-accent)]",
              pathname === "/" && "text-[var(--fp-accent)]",
            )}
          >
            News
          </Link>
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
          <Link
            href="/#brief"
            className="transition hover:text-[var(--fp-accent)]"
          >
            AI brief
          </Link>
        </nav>
      </div>
      {pathname === "/" && (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pb-4 md:flex-row md:items-center md:px-6">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="News categories">
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={categoryHref(c.id)}
                scroll={false}
                prefetch
                aria-current={active === c.id ? "page" : undefined}
                className={cn(
                  "rounded-sm px-3 py-1.5 text-sm transition",
                  active === c.id
                    ? "bg-[var(--fp-ink)] text-[var(--fp-paper)]"
                    : "bg-white/50 text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>
          <form
            className="ml-auto flex flex-1 gap-2 md:max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(() => {
                router.push(searchHref(q));
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
      )}
    </header>
  );
}
