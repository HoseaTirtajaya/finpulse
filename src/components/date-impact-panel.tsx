"use client";

import { useEffect, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AI_PASSWORD_SESSION_KEY } from "@/lib/ai/ai-password";
import type { DateImpact } from "@/lib/ai/date-impact";
import { cn } from "@/lib/utils";

const leanClass: Record<DateImpact["marketLean"], string> = {
  risk_on: "bg-emerald-100 text-emerald-900",
  risk_off: "bg-rose-100 text-rose-900",
  mixed: "bg-sky-100 text-sky-950",
  unclear: "bg-slate-100 text-slate-800",
};

const confidenceClass: Record<DateImpact["confidence"], string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-900",
  high: "bg-sky-100 text-sky-950",
};

function leanLabel(lean: DateImpact["marketLean"]) {
  switch (lean) {
    case "risk_on":
      return "Markets may feel braver";
    case "risk_off":
      return "Markets may feel cautious";
    case "mixed":
      return "Mixed signals";
    case "unclear":
      return "Too early to say";
    default:
      return lean;
  }
}

function confidenceLabel(c: DateImpact["confidence"]) {
  switch (c) {
    case "high":
      return "More confident read";
    case "medium":
      return "Moderate confidence";
    case "low":
      return "Low confidence";
    default:
      return c;
  }
}

export function DateImpactPanel({
  isoDate,
  eventCount,
}: {
  isoDate: string;
  eventCount: number;
}) {
  const [impact, setImpact] = useState<DateImpact | null>(null);
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
          `/api/calendar/date-impact?date=${encodeURIComponent(isoDate)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { impact: DateImpact | null };
        if (!cancelled) setImpact(data.impact);
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
  }, [isoDate]);

  async function run() {
    if (!password.trim()) {
      setShowPassword(true);
      setError("Enter the AI password to generate.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/date-impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: isoDate, password }),
      });
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
        throw new Error(data?.error || "Date impact failed");
      }
      const data = (await res.json()) as { impact: DateImpact };
      try {
        sessionStorage.setItem(AI_PASSWORD_SESSION_KEY, password);
      } catch {
        /* ignore */
      }
      setImpact(data.impact);
      setShowPassword(false);
    } catch (err) {
      setError(
        err instanceof Error && err.message === "Wrong password"
          ? "Wrong password. Try again."
          : err instanceof Error
            ? err.message
            : "Could not generate a date impact. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }

  function onGenerateClick() {
    if (!password.trim()) {
      setShowPassword(true);
      setError("Enter the AI password to generate.");
      return;
    }
    void run();
  }

  return (
    <section className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[var(--fp-accent)] uppercase">
            Optional AI day summary
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--fp-ink)]">
            What this day could mean
          </h2>
          <p className="mt-1 max-w-lg text-sm text-[var(--fp-muted)]">
            Plain-English take on today’s updates, using a light snapshot of
            major stock, currency, and crypto prices. Password required. Not
            financial advice.
            {eventCount === 0
              ? " No events stored — the model may stay cautious."
              : ""}
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
            ? "Writing…"
            : impact
              ? "Refresh summary"
              : "Explain this day"}
        </button>
      </div>

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

      {loadingCached && !impact && !loading && (
        <p className="mt-6 text-sm text-[var(--fp-muted)]">
          Loading cached analysis…
        </p>
      )}

      {!impact && !loading && !loadingCached && !error && (
        <p className="mt-6 text-sm text-[var(--fp-muted)]">
          No day summary yet. Enter the password for a beginner-friendly
          overview of possible market moods.
        </p>
      )}

      {loading && !impact && (
        <div className="mt-6 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--fp-chip)]" />
          <div className="h-4 w-full animate-pulse rounded bg-[var(--fp-chip)]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--fp-chip)]" />
        </div>
      )}

      {impact && (
        <div className="brief-in mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                "rounded-sm",
                leanClass[impact.marketLean],
              )}
            >
              {leanLabel(impact.marketLean)}
            </Badge>
            <Badge
              className={cn(
                "rounded-sm",
                confidenceClass[impact.confidence],
              )}
            >
              {confidenceLabel(impact.confidence)}
            </Badge>
            <Badge variant="outline" className="rounded-sm capitalize">
              {impact.model} model
            </Badge>
          </div>
          <p className="text-[15px] leading-relaxed text-[var(--fp-ink)]/90">
            {impact.summary}
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            <ImpactList title="If things go well / so-so / poorly" items={impact.scenarios} />
            <ImpactList title="Where prices might feel pressure" items={impact.trends} />
            <ImpactList title="Ways this read could be wrong" items={impact.risks} />
          </div>
          <p className="border-t border-[var(--fp-line)] pt-4 text-xs leading-relaxed text-[var(--fp-muted)]">
            {impact.disclaimer ||
              "Not financial advice. Educational research only."}
          </p>
        </div>
      )}
    </section>
  );
}

function ImpactList({ title, items }: { title: string; items: string[] }) {
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
