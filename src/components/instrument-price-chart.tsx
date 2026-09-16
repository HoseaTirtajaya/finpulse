"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { formatCalendarDate } from "@/lib/macro/date-format";
import {
  CANDLE_RANGES,
  type CandleRange,
} from "@/lib/market/candle-range";
import { formatPrice } from "@/lib/instruments";
import type { Candle, Instrument } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGE_LABELS: Record<CandleRange, string> = {
  "1mo": "1M",
  "3mo": "3M",
  "1y": "1Y",
  "5y": "5Y",
};

type ChartMode = "line" | "candles";

type CandlesResponse = {
  candles: Candle[];
  hasOhlc: boolean;
  range: CandleRange;
  source: "db" | "live";
  error?: string;
};

function toChartTime(date: string): UTCTimestamp {
  // YYYY-MM-DD → noon UTC to avoid DST edge quirks on date-only bars
  const ms = Date.parse(`${date.slice(0, 10)}T12:00:00.000Z`);
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function periodUp(candles: Candle[]): boolean {
  if (candles.length < 2) return true;
  return candles[candles.length - 1]!.close >= candles[0]!.close;
}

function periodChangePct(candles: Candle[]): number | null {
  if (candles.length < 2) return null;
  const first = candles[0]!.close;
  const last = candles[candles.length - 1]!.close;
  if (!first) return null;
  return ((last - first) / first) * 100;
}

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

export function InstrumentPriceChart({
  symbol,
  currency,
  instrumentType,
  initialCandles,
  initialRange = "1y",
  initialHasOhlc,
}: {
  symbol: string;
  currency: Instrument["currency"];
  instrumentType: Instrument["type"];
  initialCandles: Candle[];
  initialRange?: CandleRange;
  initialHasOhlc: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | ISeriesApi<"Candlestick"> | null>(
    null,
  );
  const modeRef = useRef<ChartMode>("line");

  const [range, setRange] = useState<CandleRange>(initialRange);
  const [candles, setCandles] = useState<Candle[]>(initialCandles);
  const [hasOhlc, setHasOhlc] = useState(initialHasOhlc);
  const [mode, setMode] = useState<ChartMode>("line");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  modeRef.current = mode;

  const up = useMemo(() => periodUp(candles), [candles]);
  const changePct = useMemo(() => periodChangePct(candles), [candles]);

  const applySeries = useCallback(
    (chart: IChartApi, data: Candle[], chartMode: ChartMode, ohlc: boolean) => {
      if (seriesRef.current) {
        chart.removeSeries(seriesRef.current);
        seriesRef.current = null;
      }
      if (data.length === 0) return;

      const rising = periodUp(data);
      const lineColor = rising
        ? cssVar("--fp-up", "#0f7a4c")
        : cssVar("--fp-down", "#b42318");

      const useCandles = chartMode === "candles" && ohlc;
      if (useCandles) {
        const series = chart.addSeries(CandlestickSeries, {
          upColor: cssVar("--fp-up", "#0f7a4c"),
          downColor: cssVar("--fp-down", "#b42318"),
          borderUpColor: cssVar("--fp-up", "#0f7a4c"),
          borderDownColor: cssVar("--fp-down", "#b42318"),
          wickUpColor: cssVar("--fp-up", "#0f7a4c"),
          wickDownColor: cssVar("--fp-down", "#b42318"),
        });
        series.setData(
          data.map((c) => ({
            time: toChartTime(c.date),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );
        seriesRef.current = series;
      } else {
        const series = chart.addSeries(LineSeries, {
          color: lineColor,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });
        series.setData(
          data.map((c) => ({
            time: toChartTime(c.date),
            value: c.close,
          })),
        );
        seriesRef.current = series;
      }
      chart.timeScale().fitContent();
    },
    [],
  );

  // Create chart once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      autoSize: true,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: cssVar("--fp-muted", "#5b7179"),
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: "rgba(201, 214, 218, 0.45)" },
        horzLines: { color: "rgba(201, 214, 218, 0.45)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      crosshair: {
        horzLine: { labelBackgroundColor: cssVar("--fp-ink", "#102a33") },
        vertLine: { labelBackgroundColor: cssVar("--fp-ink", "#102a33") },
      },
    });
    chartRef.current = chart;

    applySeries(chart, candles, modeRef.current, hasOhlc);

    const onMove = (param: {
      time?: unknown;
      seriesData: Map<unknown, unknown>;
    }) => {
      if (!param.time || !param.seriesData.size) {
        setHoverLabel(null);
        return;
      }
      const series = seriesRef.current;
      if (!series) return;
      const point = param.seriesData.get(series) as
        | { close?: number; value?: number }
        | undefined;
      if (!point) {
        setHoverLabel(null);
        return;
      }
      const ts =
        typeof param.time === "number"
          ? param.time
          : typeof param.time === "string"
            ? Date.parse(`${param.time}T12:00:00.000Z`) / 1000
            : null;
      if (ts == null || Number.isNaN(ts)) {
        setHoverLabel(null);
        return;
      }
      const dateLabel = formatCalendarDate(
        new Date(Math.floor(ts) * 1000).toISOString(),
      );
      const close =
        typeof point.close === "number"
          ? point.close
          : typeof point.value === "number"
            ? point.value
            : null;
      if (close == null) {
        setHoverLabel(null);
        return;
      }
      setHoverLabel(
        `${dateLabel} · ${formatPrice(close, currency, instrumentType)}`,
      );
    };

    chart.subscribeCrosshairMove(onMove);

    return () => {
      chart.unsubscribeCrosshairMove(onMove);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // Intentionally mount-once; data updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update series when candles / mode / hasOhlc change
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    applySeries(chart, candles, mode, hasOhlc);
  }, [candles, mode, hasOhlc, applySeries]);

  // Force line mode if OHLC unavailable
  useEffect(() => {
    if (!hasOhlc && mode === "candles") setMode("line");
  }, [hasOhlc, mode]);

  async function loadRange(next: CandleRange) {
    if (next === range && candles.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/instruments/${encodeURIComponent(symbol)}/candles?range=${next}`,
      );
      const data = (await res.json()) as CandlesResponse;
      if (!res.ok) {
        throw new Error(data.error || "Could not load chart data");
      }
      setRange(data.range);
      setCandles(data.candles ?? []);
      setHasOhlc(Boolean(data.hasOhlc));
      if (!data.candles?.length) {
        setError("Chart unavailable for this range.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load chart data");
    } finally {
      setLoading(false);
    }
  }

  const empty = candles.length < 2;

  return (
    <section className="rounded-xl border border-[var(--fp-line)] bg-white/55 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--fp-ink)]">
            Price chart
          </h2>
          <p className="mt-1 text-sm text-[var(--fp-muted)]">
            Daily price history. Green/red shows direction over the selected
            period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border border-[var(--fp-line)] bg-white/70 p-0.5">
            {(CANDLE_RANGES as readonly CandleRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => void loadRange(r)}
                disabled={loading}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs font-medium transition",
                  range === r
                    ? "bg-[var(--fp-ink)] text-[var(--fp-paper)]"
                    : "text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
                )}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-md border border-[var(--fp-line)] bg-white/70 p-0.5">
            <button
              type="button"
              onClick={() => setMode("line")}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs font-medium transition",
                mode === "line"
                  ? "bg-[var(--fp-ink)] text-[var(--fp-paper)]"
                  : "text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
              )}
            >
              Line
            </button>
            <button
              type="button"
              onClick={() => hasOhlc && setMode("candles")}
              disabled={!hasOhlc}
              title={
                hasOhlc
                  ? "Candlestick view"
                  : "Full OHLC not available for this asset"
              }
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs font-medium transition",
                mode === "candles"
                  ? "bg-[var(--fp-ink)] text-[var(--fp-paper)]"
                  : "text-[var(--fp-muted)] hover:text-[var(--fp-ink)]",
                !hasOhlc && "cursor-not-allowed opacity-40",
              )}
            >
              Candles
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-3 text-sm">
        {hoverLabel ? (
          <span className="font-mono text-[var(--fp-ink)]">{hoverLabel}</span>
        ) : changePct != null && !empty ? (
          <span
            className={cn(
              "font-mono",
              up ? "text-[var(--fp-up)]" : "text-[var(--fp-down)]",
            )}
          >
            {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(2)}% over {RANGE_LABELS[range]}
          </span>
        ) : null}
        {loading && (
          <span className="text-xs text-[var(--fp-muted)]">Updating…</span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      )}

      <div className="relative mt-4">
        {empty && !loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border border-dashed border-[var(--fp-line)] bg-white/80 text-sm text-[var(--fp-muted)]">
            Chart unavailable
          </div>
        )}
        <div
          ref={containerRef}
          className={cn(
            "h-[320px] w-full overflow-hidden rounded-lg",
            empty && "opacity-0",
          )}
          aria-label={`${symbol} price chart`}
        />
      </div>
    </section>
  );
}
