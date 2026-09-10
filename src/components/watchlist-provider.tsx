"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "finpulse.watchlist.v1";
const DEFAULT_SYMBOLS = ["SPY", "NVDA", "AAPL", "BBCA", "BBRI", "^JKSE"];

type WatchlistContextValue = {
  symbols: string[];
  ready: boolean;
  isWatched: (symbol: string) => boolean;
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
  toggle: (symbol: string) => void;
  reset: () => void;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

function normalize(symbol: string) {
  return symbol.trim();
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSymbols(parsed.map(normalize));
        }
      }
    } catch {
      /* keep defaults */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  }, [symbols, ready]);

  const add = useCallback((symbol: string) => {
    const s = normalize(symbol);
    setSymbols((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }, []);

  const remove = useCallback((symbol: string) => {
    const s = normalize(symbol);
    setSymbols((prev) => prev.filter((x) => x !== s));
  }, []);

  const toggle = useCallback((symbol: string) => {
    const s = normalize(symbol);
    setSymbols((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }, []);

  const reset = useCallback(() => setSymbols(DEFAULT_SYMBOLS), []);

  const isWatched = useCallback(
    (symbol: string) => symbols.includes(normalize(symbol)),
    [symbols],
  );

  const value = useMemo(
    () => ({ symbols, ready, isWatched, add, remove, toggle, reset }),
    [symbols, ready, isWatched, add, remove, toggle, reset],
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within WatchlistProvider");
  }
  return ctx;
}
