"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AI_PASSWORD_SESSION_KEY } from "@/lib/ai/ai-password";
import type { InstrumentReview } from "@/lib/ai/instrument-review";
import type { MacroEvent } from "@/lib/news/query-news";
import { cn } from "@/lib/utils";

const stanceClass: Record<InstrumentReview["stance"], string> = {
  bullish: "bg-emerald-100 text-emerald-900",
  bearish: "bg-rose-100 text-rose-900",
  neutral: "bg-slate-100 text-slate-800",
};

const confidenceClass: Record<InstrumentReview["confidence"], string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-900",
  high: "bg-sky-100 text-sky-950",
};

export function InstrumentReviewPanel({
  symbol,
  upcomingEvents = [],
}: {
  symbol: string;
  upcomingEvents?: MacroEvent[];
}) {
  const [review, setReview] = useState<InstrumentReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCached, setLoadingCached] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(AI_PASSWORD_SESSION_KEY);
      if (saved) setPassword(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCached() {
      setLoadingCached(true);
      try {
        const res = await fetch(
          `/api/instruments/${encodeURIComponent(symbol)}/review`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { review: InstrumentReview | null };
        if (!cancelled) setReview(data.review);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingCached(false);
      }
    }
    void loadCached();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  async function run() {
    if (!password.trim()) {
      setShowPassword(true);
      setError("Enter the AI password to generate a review.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/instruments/${encodeURIComponent(symbol)}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        },
      );
      if (res.status === 401) {
        setShowPassword(true);
        try {
          sessionStorage.removeItem(AI_PASSWORD_SESSION_KEY);
        } catch {
          /* ignore */
        }
        throw new Error("Wrong password");
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Review failed");
      }
      const data = (await res.json()) as { review: InstrumentReview };
      try {
        sessionStorage.setItem(AI_PASSWORD_SESSION_KEY, password);
      } catch {
        /* ignore */
      }
      setReview(data.review);
      setShowPassword(false);
    } catch (err) {
      setError(
        err instanceof Error && err.message === "Wrong password"
          ? "Wrong password. Try again."
          : err instanceof Error
            ? err.message
            : "Could not generate a review. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }

  function onGenerateClick() {
    if (!password.trim()) {
      setShowPassword(true);
      setError("Enter the AI password to generate a review.");
      return;
    }
    void run();
  }

  return (
    <section className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[var(--fp-accent)] uppercase">
            AI instrument review
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--fp-ink)]">
            {symbol} research lean
          </h2>
          <p className="mt-1 max-w-lg text-sm text-[var(--fp-muted)]">
            Uses recent price action plus upcoming high/medium calendar events.
            Password required to generate. Not financial advice.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerateClick}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--fp-ink)] px-3 text-sm font-medium text-[var(--fp-paper)] transition hover:bg-[var(--fp-accent)] disabled:pointer-events-none disabled:opacity-50"
        >
          <Lock className="size-3.5 opacity-80" />
          <Sparkles className="size-4" />
          {loading
            ? "Synthesizing…"
            : review
              ? "Refresh review"
              : "Generate review"}
        </button>
      </div>

      {upcomingEvents.length > 0 && (
        <div className="mt-4 rounded-lg border border-[var(--fp-line)] bg-white/60 px-3 py-3">
          <h3 className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
            Upcoming catalysts (next 7d)
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--fp-ink)]">
            {upcomingEvents.slice(0, 5).map((ev) => (
              <li key={ev.id} className="flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="font-medium">{ev.title}</span>
                <span className="text-[var(--fp-muted)]">
                  {ev.country} · {format(new Date(ev.eventAt), "MMM d")} ·{" "}
                  {ev.impact}
                  {ev.forecast ? ` · fcast ${ev.forecast}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showPassword && (
        <div className="mt-4 flex flex-wrap items-end gap-2 rounded-lg border border-[var(--fp-line)] bg-white/70 p-3">
          <label className="min-w-[200px] flex-1">
            <span className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
              AI password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void run();
              }}
              placeholder="Required to generate"
              className="mt-1 w-full rounded-md border border-[var(--fp-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--fp-accent)]"
            />
          </label>
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading || !password.trim()}
            className="inline-flex h-9 items-center rounded-md bg-[var(--fp-accent)] px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Unlock & generate
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {loadingCached && !review && !loading && (
        <p className="mt-6 text-sm text-[var(--fp-muted)]">Loading cached review…</p>
      )}

      {!review && !loading && !loadingCached && !error && (
        <p className="mt-6 text-sm text-[var(--fp-muted)]">
          No review yet. Enter the password and generate a stance from price +
          calendar context.
        </p>
      )}

      {loading && !review && (
        <div className="mt-6 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--fp-chip)]" />
          <div className="h-4 w-full animate-pulse rounded bg-[var(--fp-chip)]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--fp-chip)]" />
        </div>
      )}

      {review && (
        <div className="brief-in mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-sm capitalize", stanceClass[review.stance])}>
              {review.stance}
            </Badge>
            <Badge
              className={cn(
                "rounded-sm capitalize",
                confidenceClass[review.confidence],
              )}
            >
              {review.confidence} confidence
            </Badge>
            <Badge variant="outline" className="rounded-sm capitalize">
              {review.model} model
            </Badge>
          </div>
          <p className="text-[15px] leading-relaxed text-[var(--fp-ink)]/90">
            {review.summary}
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <ReviewList title="Rationale" items={review.rationale} />
            <ReviewList title="Risks" items={review.risks} />
          </div>
          <p className="border-t border-[var(--fp-line)] pt-4 text-xs leading-relaxed text-[var(--fp-muted)]">
            {review.disclaimer ||
              "Not financial advice. Educational research only."}
          </p>
        </div>
      )}
    </section>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
        {title}
      </h4>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--fp-muted)]">—</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm text-[var(--fp-ink)]">
          {list.map((item, i) => (
            <li key={`${i}-${item}`} className="leading-snug">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
