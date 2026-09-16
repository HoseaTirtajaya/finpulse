import { explainMacroEvent } from "@/lib/macro/event-explainer";

/** Compact plain-English blurb under an event title (no AI). */
export function EventExplainerBlurb({
  title,
  sector,
  country,
  compact = false,
}: {
  title: string;
  sector?: string | null;
  country?: string | null;
  compact?: boolean;
}) {
  const e = explainMacroEvent(title, { sector, country });
  return (
    <div
      className={
        compact
          ? "mt-1.5 space-y-0.5 text-xs leading-snug text-[var(--fp-muted)]"
          : "mt-2 space-y-1 rounded-md bg-[var(--fp-chip)]/60 px-3 py-2 text-xs leading-relaxed text-[var(--fp-ink)]/85"
      }
    >
      <p>
        <span className="font-semibold text-[var(--fp-ink)]">What it is: </span>
        {e.whatItIs}
      </p>
      <p>
        <span className="font-semibold text-[var(--fp-ink)]">
          Why markets care:{" "}
        </span>
        {e.whyItMatters}
      </p>
      {!compact && e.watchFor && (
        <p>
          <span className="font-semibold text-[var(--fp-ink)]">Watch for: </span>
          {e.watchFor}
        </p>
      )}
    </div>
  );
}
