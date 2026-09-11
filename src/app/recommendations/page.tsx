import { Suspense } from "react";
import { connection } from "next/server";
import { RecommendationsBoard } from "@/components/recommendations-board";

export const instant = false;

export default async function RecommendationsPage() {
  await connection();
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6">
      <Suspense
        fallback={
          <p className="text-sm text-[var(--fp-muted)]">Loading rankings…</p>
        }
      >
        <RecommendationsBoard />
      </Suspense>
    </main>
  );
}
