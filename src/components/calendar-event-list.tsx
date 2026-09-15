"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Lock, Sparkles } from "lucide-react";
import { AI_PASSWORD_SESSION_KEY } from "@/lib/ai/ai-password";
import type { EventBrief } from "@/lib/ai/event-brief";
import { formatCalendarDateTime } from "@/lib/macro/date-format";
import type { MacroEvent } from "@/lib/news/query-news";
import { cn } from "@/lib/utils";

export function CalendarEventList({ events }: { events: MacroEvent[] }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [briefs, setBriefs] = useState<Record<string, EventBrief | null>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(AI_PASSWORD_SESSION_KEY);
      if (saved) setPassword(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Prefetch cached briefs for visible events (no password).
  useEffect(() => {
    let cancelled = false;
    async function prefetch() {
      const next: Record<string, EventBrief | null> = {};
      await Promise.all(
        events.slice(0, 24).map(async (ev) => {
          try {
            const res = await fetch(
              `/api/calendar/event-brief?eventId=${encodeURIComponent(ev.id)}`,
            );
            if (!res.ok) return;
            const data = (await res.json()) as { brief: EventBrief | null };
            next[ev.id] = data.brief;
          } catch {
            /* ignore */
          }
        }),
      );
      if (!cancelled) {
        setBriefs((prev) => ({ ...prev, ...next }));
      }
    }
    if (events.length > 0) void prefetch();
    return () => {
      cancelled = true;
    };
  }, [events]);

  const generate = useCallback(
    async (eventId: string, pw: string) => {
      if (!pw.trim()) {
        setPendingEventId(eventId);
        setShowPassword(true);
        setError("Enter the AI password to generate an event brief.");
        return;
      }
      setLoadingId(eventId);
      setError(null);
      try {
        const res = await fetch("/api/calendar/event-brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, password: pw }),
        });
        if (res.status === 401) {
          setShowPassword(true);
          setPendingEventId(eventId);
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
          throw new Error(data?.error || "Brief failed");
        }
        const data = (await res.json()) as { brief: EventBrief };
        try {
          sessionStorage.setItem(AI_PASSWORD_SESSION_KEY, pw);
        } catch {
          /* ignore */
        }
        setBriefs((prev) => ({ ...prev, [eventId]: data.brief }));
        setShowPassword(false);
        setPendingEventId(null);
      } catch (err) {
        setError(
          err instanceof Error && err.message === "Wrong password"
            ? "Wrong password. Try again."
            : err instanceof Error
              ? err.message
              : "Could not generate brief.",
        );
      } finally {
        setLoadingId(null);
      }
    },
    [],
  );

  function onSummarizeClick(eventId: string) {
    if (!password.trim()) {
      setPendingEventId(eventId);
      setShowPassword(true);
      setError("Enter the AI password to generate an event brief.");
      return;
    }
    void generate(eventId, password);
  }

  if (events.length === 0) {
    return (
      <p className="mt-4 text-sm text-[var(--fp-muted)]">
        No events in store for this date. Try another day or run ingest.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {showPassword && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--fp-line)] bg-white/70 p-3">
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
                if (e.key === "Enter" && pendingEventId) {
                  void generate(pendingEventId, password);
                }
              }}
              placeholder="Required for event briefs"
              className="mt-1 w-full rounded-md border border-[var(--fp-line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--fp-accent)]"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (pendingEventId) void generate(pendingEventId, password);
            }}
            disabled={!password.trim() || !pendingEventId || loadingId != null}
            className="inline-flex h-9 items-center rounded-md bg-[var(--fp-accent)] px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Unlock & generate
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <ul className="space-y-4">
        {events.map((ev) => {
          const brief = briefs[ev.id];
          const loading = loadingId === ev.id;
          return (
            <li
              key={ev.id}
              className="rounded-lg border border-[var(--fp-line)] bg-white/60 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--fp-ink)]">
                    {ev.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--fp-muted)]">
                    {ev.country} · {formatCalendarDateTime(ev.eventAt)}
                    {ev.sector ? ` · ${ev.sector}` : ""}
                    {ev.eventType ? ` · ${ev.eventType}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      "rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase",
                      ev.impact === "high"
                        ? "bg-rose-100 text-rose-900"
                        : ev.impact === "medium"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {ev.impact}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSummarizeClick(ev.id)}
                    disabled={loading}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--fp-line)] bg-white px-2 text-xs font-medium text-[var(--fp-ink)] transition hover:border-[var(--fp-accent)] disabled:opacity-50"
                  >
                    <Lock className="size-3 opacity-70" />
                    <Sparkles className="size-3" />
                    {loading
                      ? "…"
                      : brief
                        ? "Refresh brief"
                        : "AI brief"}
                  </button>
                </div>
              </div>

              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--fp-muted)]">
                {ev.forecast != null && (
                  <div>
                    <dt className="inline font-semibold">Forecast </dt>
                    <dd className="inline">{ev.forecast}</dd>
                  </div>
                )}
                {ev.previous != null && (
                  <div>
                    <dt className="inline font-semibold">Previous </dt>
                    <dd className="inline">{ev.previous}</dd>
                  </div>
                )}
                {ev.actual != null && (
                  <div>
                    <dt className="inline font-semibold">Actual </dt>
                    <dd className="inline">{ev.actual}</dd>
                  </div>
                )}
                {ev.sourceUrl && (
                  <a
                    href={ev.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--fp-accent)] hover:underline"
                  >
                    Official source <ExternalLink className="size-3" />
                  </a>
                )}
              </dl>

              {brief && (
                <div className="mt-3 space-y-2 border-t border-[var(--fp-line)] pt-3">
                  <p className="text-sm leading-relaxed text-[var(--fp-ink)]/90">
                    {brief.summary}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <BriefBullets title="Key points" items={brief.keyPoints} />
                    <BriefBullets
                      title="Possible market notes"
                      items={brief.marketNotes}
                    />
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--fp-muted)]">
                    {brief.disclaimer}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BriefBullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold tracking-wider text-[var(--fp-muted)] uppercase">
        {title}
      </h4>
      <ul className="mt-1 space-y-1 text-xs text-[var(--fp-ink)]">
        {items.map((item, i) => (
          <li key={`${i}-${item}`} className="leading-snug">
            · {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
