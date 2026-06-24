import type { SimulationResult } from "@/types/simulation";

/** True when the simulation actually moved traffic through the graph — i.e. the
 *  design is connected with a valid entry point. Guards problem-aware checks
 *  (SLA, capacity) from "passing" a disconnected canvas where nothing flows. */
export function simHasTraffic(sim: SimulationResult): boolean {
  for (const m of sim.nodeMetrics.values()) {
    if (m.incomingQPS > 0) return true;
  }
  return false;
}

/** Compact number formatting for feedback strings (12,000 → "12K", 1.5M…). */
export function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `${Math.round(n)}`;
}
