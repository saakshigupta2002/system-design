import type { ScoreEntry } from "@/store/scoreHistoryStore";
import type { DrillCategory } from "@/data/drills";

/**
 * Adaptive progression: turns a user's scoring history into a "focus area" —
 * the design dimension they consistently score lowest on — plus a concrete next
 * action (which drills to practice) and a problem worth retrying.
 */

export interface FocusArea {
  category: string;
  /** Average score ratio (0–1) for this category across recent attempts. */
  avgPct: number;
  tip: string;
  drillCategory?: DrillCategory;
}

interface CategoryGuide {
  tip: string;
  drillCategory?: DrillCategory;
}

const CATEGORY_GUIDE: Record<string, CategoryGuide> = {
  Scalability: { tip: "Revisit load balancing, caching, and DB sharding/replicas.", drillCategory: "scale" },
  Availability: { tip: "Add replicas, redundant paths, monitoring, and overload protection.", drillCategory: "failure" },
  Latency: { tip: "Cache before the DB, cut request hops, and push static content to a CDN.", drillCategory: "optimization" },
  "Cost Efficiency": { tip: "Right-size components and use caching to avoid over-provisioning.", drillCategory: "optimization" },
  "Trade-offs": { tip: "Separate read/write paths and reason about consistency choices.", drillCategory: "consistency" },
  "Deep-Dive": { tip: "Use the Deep Dive tab to define APIs, the data model, and a consistency choice.", drillCategory: undefined },
};

const RECENT = 12;

/** The weakest category across recent attempts, or null if there's no data. */
export function computeFocusArea(entries: ScoreEntry[]): FocusArea | null {
  const recent = entries.slice(-RECENT).filter((e) => e.categories && e.categories.length > 0);
  if (recent.length === 0) return null;

  const sums = new Map<string, { score: number; max: number }>();
  for (const e of recent) {
    for (const c of e.categories!) {
      const acc = sums.get(c.c) ?? { score: 0, max: 0 };
      acc.score += c.s;
      acc.max += c.m;
      sums.set(c.c, acc);
    }
  }

  let worst: FocusArea | null = null;
  for (const [category, { score, max }] of sums) {
    if (max <= 0) continue;
    const avgPct = score / max;
    if (!worst || avgPct < worst.avgPct) {
      const guide = CATEGORY_GUIDE[category] ?? { tip: "Review this area.", drillCategory: undefined };
      worst = { category, avgPct, tip: guide.tip, drillCategory: guide.drillCategory };
    }
  }
  // Only surface a focus area if there's a real weakness (under 75%).
  return worst && worst.avgPct < 0.75 ? worst : null;
}

/** The problem most worth retrying: lowest recent total that isn't yet strong. */
export function recommendRetry(entries: ScoreEntry[]): { problemId: string; total: number } | null {
  const best = new Map<string, number>();
  for (const e of entries) {
    best.set(e.problemId, Math.max(best.get(e.problemId) ?? 0, e.total));
  }
  let pick: { problemId: string; total: number } | null = null;
  for (const [problemId, total] of best) {
    if (problemId.startsWith("custom-")) continue;
    if (total >= 71) continue; // already strong
    if (!pick || total < pick.total) pick = { problemId, total };
  }
  return pick;
}
