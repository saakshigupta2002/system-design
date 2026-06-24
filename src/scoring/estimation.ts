import type { Problem } from "@/types/problem";

/**
 * Back-of-the-envelope estimation grading.
 *
 * System-design interviews are half estimation. We derive the "reference"
 * ballpark for a problem from its clean structured `requirements`
 * (reads/sec, writes/sec) plus a couple of free-text hints (peak multiplier,
 * bytes-per-item), then grade the user's estimate by *order of magnitude* —
 * estimation is about getting within a factor, not exact numbers.
 */

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const DEFAULT_PEAK_MULTIPLIER = 3;
const DEFAULT_BYTES_PER_ITEM = 1024; // 1 KB

export interface EstimationHints {
  peakMultiplier?: string;
  storagePerItem?: string;
}

export interface EstimationTargets {
  /** reads/sec + writes/sec, averaged. */
  avgQps: number;
  /** average × peak multiplier. */
  peakQps: number;
  /** writes/sec × seconds/year × bytes-per-item. */
  storagePerYearBytes: number;
  /** peak QPS × bytes-per-item × 8. */
  peakBandwidthBps: number;
  /** parsed assumptions used, surfaced so the UI can explain the method. */
  peakMultiplier: number;
  bytesPerItem: number;
}

export type EstimationKey = "peakQps" | "storagePerYearBytes" | "peakBandwidthBps";
export type EstimationVerdict = "spot-on" | "close" | "off" | "missing";

export interface EstimationItemResult {
  key: EstimationKey;
  label: string;
  reference: number;
  guess: number | undefined;
  /** max(guess/ref, ref/guess); 1 = exact. */
  factor: number;
  verdict: EstimationVerdict;
}

export interface EstimationGrade {
  items: EstimationItemResult[];
  passed: number;
  total: number;
}

/** Parse a leading "<n>x" multiplier from a hint, e.g. "5x during events" → 5. */
export function parseMultiplier(hint?: string): number {
  if (!hint) return DEFAULT_PEAK_MULTIPLIER;
  const m = hint.match(/(\d+(?:\.\d+)?)\s*x/i);
  return m ? parseFloat(m[1]) : DEFAULT_PEAK_MULTIPLIER;
}

const UNIT_BYTES: Record<string, number> = {
  b: 1, byte: 1, bytes: 1,
  kb: 1024, k: 1024,
  mb: 1024 ** 2, m: 1024 ** 2,
  gb: 1024 ** 3, g: 1024 ** 3,
  tb: 1024 ** 4, t: 1024 ** 4,
  pb: 1024 ** 5,
};

/** Parse the first "<n> <unit>" size from a hint, e.g. "~500 bytes per URL" →
 *  500, "~1 KB per tweet" → 1024. Binary units, to match the calculator. */
export function parseBytes(hint?: string): number {
  if (!hint) return DEFAULT_BYTES_PER_ITEM;
  const m = hint.match(/(\d+(?:\.\d+)?)\s*(bytes|byte|kb|mb|gb|tb|pb|b|k|m|g|t)\b/i);
  if (!m) return DEFAULT_BYTES_PER_ITEM;
  const n = parseFloat(m[1]);
  const unit = UNIT_BYTES[m[2].toLowerCase()] ?? 1;
  return n * unit;
}

/** Compute the reference ballpark targets for a problem. */
export function referenceTargets(problem: Problem, hints?: EstimationHints): EstimationTargets {
  const { readsPerSec, writesPerSec } = problem.requirements;
  const avgQps = Math.max(0, readsPerSec + writesPerSec);
  const peakMultiplier = parseMultiplier(hints?.peakMultiplier);
  const peakQps = avgQps * peakMultiplier;
  const bytesPerItem = parseBytes(hints?.storagePerItem);
  const storagePerYearBytes = Math.max(0, writesPerSec) * SECONDS_PER_YEAR * bytesPerItem;
  const peakBandwidthBps = peakQps * bytesPerItem * 8;
  return { avgQps, peakQps, storagePerYearBytes, peakBandwidthBps, peakMultiplier, bytesPerItem };
}

function verdictFor(guess: number | undefined, reference: number): { factor: number; verdict: EstimationVerdict } {
  if (guess === undefined || guess <= 0 || reference <= 0) {
    return { factor: Infinity, verdict: "missing" };
  }
  const factor = Math.max(guess / reference, reference / guess);
  if (factor <= 1.5) return { factor, verdict: "spot-on" };
  if (factor <= 5) return { factor, verdict: "close" };
  return { factor, verdict: "off" };
}

const LABELS: Record<EstimationKey, string> = {
  peakQps: "Peak QPS",
  storagePerYearBytes: "Storage / year",
  peakBandwidthBps: "Peak bandwidth",
};

/** Grade the user's estimates (any subset) against the problem's reference. A
 *  "close" estimate (right order of magnitude) counts as passed. */
export function gradeEstimation(
  guess: Partial<Record<EstimationKey, number>>,
  problem: Problem,
  hints?: EstimationHints
): EstimationGrade {
  const ref = referenceTargets(problem, hints);
  const keys: EstimationKey[] = ["peakQps", "storagePerYearBytes", "peakBandwidthBps"];
  const items = keys.map<EstimationItemResult>((key) => {
    const reference = ref[key];
    const g = guess[key];
    const { factor, verdict } = verdictFor(g, reference);
    return { key, label: LABELS[key], reference, guess: g, factor, verdict };
  });
  const passed = items.filter((i) => i.verdict === "spot-on" || i.verdict === "close").length;
  return { items, passed, total: items.length };
}
