"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--fp-ink)]">
        Something went wrong
      </h1>
      <p className="text-sm text-[var(--fp-muted)]">
        {error.message || "The desk hit an unexpected error. Try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-[var(--fp-line)] bg-[var(--fp-panel)] px-3 py-1.5 text-sm text-[var(--fp-ink)] hover:bg-[var(--fp-line)]/30"
      >
        Retry
      </button>
    </main>
  );
}
