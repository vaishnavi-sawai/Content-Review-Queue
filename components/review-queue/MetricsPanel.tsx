"use client";

import type { QueueMetrics } from "./types";

interface MetricsPanelProps {
  metrics: QueueMetrics | undefined;
  isLoading: boolean;
}

export function MetricsPanel({ metrics, isLoading }: MetricsPanelProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Queue Metrics</h2>
      {isLoading || !metrics ? (
        <p className="mt-3 text-sm text-zinc-600">Loading metrics...</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="text-xs uppercase text-zinc-500">Available</p>
            <p className="text-xl font-semibold text-zinc-900">{metrics.available}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="text-xs uppercase text-zinc-500">Reserved</p>
            <p className="text-xl font-semibold text-zinc-900">{metrics.reserved}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="text-xs uppercase text-zinc-500">Confirmed</p>
            <p className="text-xl font-semibold text-zinc-900">{metrics.confirmed}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 p-3">
            <p className="text-xs uppercase text-zinc-500">Auto-released</p>
            <p className="text-xl font-semibold text-zinc-900">{metrics.released}</p>
          </div>
        </div>
      )}
    </section>
  );
}
