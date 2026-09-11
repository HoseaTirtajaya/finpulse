import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--fp-ink)]">
        Page not found
      </h1>
      <p className="text-sm text-[var(--fp-muted)]">
        That route does not exist on this desk.
      </p>
      <Link
        href="/"
        className="rounded-md border border-[var(--fp-line)] bg-[var(--fp-panel)] px-3 py-1.5 text-sm text-[var(--fp-ink)] hover:bg-[var(--fp-line)]/30"
      >
        Home
      </Link>
    </main>
  );
}
