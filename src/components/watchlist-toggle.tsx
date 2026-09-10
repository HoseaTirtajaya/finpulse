"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/components/watchlist-provider";

export function WatchlistToggle({ symbol }: { symbol: string }) {
  const { isWatched, toggle, ready } = useWatchlist();
  const watched = isWatched(symbol);

  return (
    <Button
      type="button"
      disabled={!ready}
      onClick={() => toggle(symbol)}
      variant="secondary"
      className="border border-[var(--fp-line)] bg-white/70"
    >
      <Star
        className={
          watched ? "size-4 fill-current text-[var(--fp-accent)]" : "size-4"
        }
      />
      {watched ? "On watchlist" : "Add to watchlist"}
    </Button>
  );
}
