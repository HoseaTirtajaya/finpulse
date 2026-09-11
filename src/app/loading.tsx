export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-10 md:px-6">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--fp-line)]/60" />
      <div className="h-4 w-full max-w-xl animate-pulse rounded bg-[var(--fp-line)]/40" />
      <div className="mt-6 grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-[var(--fp-line)]/30"
          />
        ))}
      </div>
    </main>
  );
}
