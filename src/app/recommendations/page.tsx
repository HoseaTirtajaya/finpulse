import { RecommendationsBoard } from "@/components/recommendations-board";

export const dynamic = "force-dynamic";

export default function RecommendationsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-6">
      <RecommendationsBoard />
    </main>
  );
}
