"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AiBrief, NewsScope } from "@/lib/types";
import { cn } from "@/lib/utils";

const stanceClass: Record<AiBrief["stance"], string> = {
  constructive: "bg-emerald-100 text-emerald-900",
  cautious: "bg-amber-100 text-amber-950",
  neutral: "bg-slate-100 text-slate-800",
  mixed: "bg-sky-100 text-sky-950",
};

export function AiBriefPanel({
  symbol,
  scope = "finance",
  initialBrief,
}: {
  symbol?: string;
  scope?: NewsScope;
  initialBrief?: AiBrief | null;
}) {
  const [brief, setBrief] = useState<AiBrief | null>(initialBrief ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, scope }),
      });
      if (!res.ok) throw new Error("Brief failed");
      const data = (await res.json()) as { brief: AiBrief };
      setBrief(data.brief);
    } catch {
      setError("Could not generate a brief. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  const title = symbol
    ? `${symbol} retail research brief`
    : scope === "trending"
      ? "What’s moving"
      : scope === "general"
        ? "General desk take"
        : "What the tape is saying";

  const retail = Boolean(symbol);

  return (
    <section className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[var(--fp-accent)] uppercase">
            AI research brief
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--fp-ink)]">
            {title}
          </h2>
          <p className="mt-1 max-w-lg text-sm text-[var(--fp-muted)]">
            {retail
              ? "Generates probable outcomes, timing conditions, risk analysis, and pre-trade checks from matched headlines — research only, not a buy/sell call."
              : "Click generate to synthesize stance, risks, and what to watch. Heuristic fallback; Gemini/OpenAI only on demand."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--fp-ink)] px-3 text-sm font-medium text-[var(--fp-paper)] transition hover:bg-[var(--fp-accent)] disabled:pointer-events-none disabled:opacity-50"
        >
          <Sparkles className="size-4" />
          {loading ? "Synthesizing…" : brief ? "Refresh brief" : "Generate brief"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {!brief && !loading && !error && (
        <p className="mt-6 text-sm text-[var(--fp-muted)]">
          {retail
            ? "No brief yet. Generate one for bull/base/bear paths, when conditions favor patience vs engagement, and a risk checklist."
            : "No brief yet. Generate one to see a structured read of the latest coverage."}
        </p>
      )}

      {loading && !brief && (
        <div className="mt-6 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--fp-chip)]" />
          <div className="h-4 w-full animate-pulse rounded bg-[var(--fp-chip)]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--fp-chip)]" />
        </div>
      )}

      {brief && (
        <div className="brief-in mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-sm", stanceClass[brief.stance])}>
              {brief.stance}
            </Badge>
            <Badge variant="outline" className="rounded-sm capitalize">
              {brief.model} model
            </Badge>
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
            {brief.headline}
          </h3>
          <p className="text-[15px] leading-relaxed text-[var(--fp-ink)]/90">
            {brief.summary}
          </p>

          {retail ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <BriefList
                  title="Probable outcomes"
                  items={brief.scenarios ?? []}
                  empty="Generate with an AI model for bull/base/bear paths."
                />
                <BriefList
                  title="When conditions matter"
                  items={brief.timing ?? []}
                  empty="Timing cues appear when the model returns them."
                />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <BriefList title="Risk analysis" items={brief.risks} />
                <BriefList title="What to watch" items={brief.whatToWatch} />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <BriefList title="Key drivers" items={brief.bullets} />
                <BriefList
                  title="Before you act — check"
                  items={brief.investorChecks ?? []}
                />
              </div>
              <BriefList
                title="Leverage trading (high risk)"
                items={brief.leverageTrading ?? []}
                empty="Leverage notes appear when the model returns them."
              />
            </>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              <BriefList title="From the headlines" items={brief.bullets} />
              <BriefList title="Risks" items={brief.risks} />
              <BriefList title="What to watch" items={brief.whatToWatch} />
            </div>
          )}

          {brief.citedHeadlines?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
                Cited headlines
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-[var(--fp-muted)]">
                {brief.citedHeadlines.slice(0, 6).map((h, i) => {
                  const label = citeLabel(h);
                  return (
                    <li key={`${i}-${label}`} className="truncate">
                      · {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="border-t border-[var(--fp-line)] pt-4 text-xs leading-relaxed text-[var(--fp-muted)]">
            {brief.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
}

/** Coerce LLM quirks ({title, source}) into a display string. */
function citeLabel(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const title =
      typeof rec.title === "string"
        ? rec.title
        : typeof rec.headline === "string"
          ? rec.headline
          : null;
    const source = typeof rec.source === "string" ? rec.source : null;
    if (title && source) return `${source}: ${title}`;
    if (title) return title;
  }
  return String(value ?? "");
}

function BriefList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
        {title}
      </h4>
      {list.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--fp-muted)]">
          {empty ?? "—"}
        </p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm text-[var(--fp-ink)]">
          {list.map((item, i) => {
            const label = citeLabel(item);
            return (
              <li key={`${i}-${label}`} className="leading-snug">
                {label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
