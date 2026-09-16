import {
  explainMacroEvent,
  plainImpactLabel,
  plainRegionLabel,
} from "@/lib/macro/event-explainer";

/** Compact plain-English blurb under an event title (no AI). */
export function EventExplainerBlurb({
  title,
  sector,
  country,
  compact = false,
  showSimpleTitle = true,
}: {
  title: string;
  sector?: string | null;
  country?: string | null;
  compact?: boolean;
  showSimpleTitle?: boolean;
}) {
  const e = explainMacroEvent(title, { sector, country });
  const region = plainRegionLabel(country);

  return (
    <div
      className={
        compact
          ? "mt-1.5 space-y-1 text-xs leading-snug text-[var(--fp-muted)]"
          : "mt-2 space-y-1.5 rounded-md bg-[var(--fp-chip)]/60 px-3 py-2.5 text-sm leading-relaxed text-[var(--fp-ink)]/90"
      }
    >
      {showSimpleTitle && (
        <p className="font-medium text-[var(--fp-ink)]">{e.simpleTitle}</p>
      )}
      <p>
        <span className="font-semibold text-[var(--fp-ink)]">In simple words: </span>
        {e.whatItIs}
      </p>
      <p>
        <span className="font-semibold text-[var(--fp-ink)]">
          Why you might care:{" "}
        </span>
        {e.whyItMatters}
      </p>
      {!compact && e.watchFor && (
        <p>
          <span className="font-semibold text-[var(--fp-ink)]">
            If the number surprises:{" "}
          </span>
          {e.watchFor}
        </p>
      )}
      {!compact && region && (
        <p className="text-xs text-[var(--fp-muted)]">
          Region: {region}
          {country ? ` (${country})` : ""}
        </p>
      )}
    </div>
  );
}

export { plainImpactLabel, plainRegionLabel };
