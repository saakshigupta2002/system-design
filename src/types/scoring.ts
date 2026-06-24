import type { Problem } from "./problem";
import type { SimulationResult } from "./simulation";

/** Optional problem context threaded into the scoring rules. When a built-in
 *  problem is selected, the scorer simulates the design at the problem's
 *  required load and grades latency/throughput against the stated SLA — so the
 *  score reflects *this* problem, not a generic checklist. Absent (custom
 *  problems, or no selection) the rules fall back to their heuristics. */
export interface ScoreContext {
  problem?: Problem;
  /** Simulation run at `requiredLoad`, used for SLA / capacity checks. */
  sim?: SimulationResult;
  /** reads/sec + writes/sec from the problem requirements. */
  requiredLoad?: number;
}

export interface CategoryScore {
  category: string;
  score: number; // 0-20
  maxScore: number; // 20
  feedback: string[];
  passed: string[];
}

export interface ScoreResult {
  total: number; // 0-100
  categories: CategoryScore[];
  verdict: string;
  verdictColor: string;
  summary: string;
}
