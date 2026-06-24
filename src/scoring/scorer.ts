import type { Node, Edge } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";
import type { ScoreResult, ScoreContext } from "@/types/scoring";
import type { Problem } from "@/types/problem";
import type { DeepDiveEntry } from "@/types/deepDive";
import { runSimulation } from "@/engine/simulator";
import { scoreScalability } from "./rules/scalability";
import { scoreAvailability } from "./rules/availability";
import { scoreLatency } from "./rules/latency";
import { scoreCost } from "./rules/cost";
import { scoreTradeoffs } from "./rules/tradeoffs";
import { scoreDeepDive } from "./deepDive";

/** Advanced mode keeps the total at 100 by scaling the five design categories
 *  to 80 and giving the Deep-Dive dimension the remaining 20. */
const DESIGN_WEIGHT_ADVANCED = 0.8;

function getVerdict(total: number): { verdict: string; verdictColor: string } {
  if (total >= 86) return { verdict: "Architect Level", verdictColor: "text-emerald-400" };
  if (total >= 71) return { verdict: "Excellent", verdictColor: "text-cyan-400" };
  if (total >= 51) return { verdict: "Good", verdictColor: "text-blue-400" };
  if (total >= 31) return { verdict: "Decent", verdictColor: "text-amber-400" };
  return { verdict: "Needs Work", verdictColor: "text-rose-400" };
}

/**
 * Score a design. When `problem` is supplied, the design is simulated at the
 * problem's required load (reads/sec + writes/sec) so the latency and
 * scalability rules can grade against the stated SLA and throughput target
 * instead of a generic checklist.
 */
export function scoreDesign(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  problem?: Problem,
  /** Advanced mode: when provided with a problem, adds the Deep-Dive dimension
   *  (estimation + API + data model + consistency) and renormalizes to 100. */
  deepDive?: DeepDiveEntry | null
): ScoreResult {
  if (nodes.length === 0) {
    return {
      total: 0,
      categories: [],
      verdict: "Empty Canvas",
      verdictColor: "text-zinc-500",
      summary: "Add components to the canvas to get a score.",
    };
  }

  // Build problem context: simulate at the required load so rules can check
  // "does this actually meet the SLA / sustain the traffic this problem asks
  // for?" rather than just "is a cache present?".
  let ctx: ScoreContext | undefined;
  if (problem) {
    const requiredLoad = Math.max(
      1,
      problem.requirements.readsPerSec + problem.requirements.writesPerSec
    );
    const sim = runSimulation(nodes, edges, requiredLoad);
    ctx = { problem, sim, requiredLoad };
  }

  const categories = [
    scoreScalability(nodes, edges, ctx),
    scoreAvailability(nodes, edges, ctx),
    scoreLatency(nodes, edges, ctx),
    scoreCost(nodes, edges, ctx),
    scoreTradeoffs(nodes, edges, ctx),
  ];

  // Clamp each category score to [0, maxScore]
  for (const c of categories) {
    c.score = Math.max(0, Math.min(c.score, c.maxScore));
  }

  // Advanced mode: scale the design categories to 80 and append Deep-Dive (20).
  if (deepDive && problem) {
    for (const c of categories) {
      c.score = Math.round(c.score * DESIGN_WEIGHT_ADVANCED);
      c.maxScore = Math.round(c.maxScore * DESIGN_WEIGHT_ADVANCED);
    }
    categories.push(scoreDeepDive(deepDive, problem));
  }

  const rawTotal = categories.reduce((sum, c) => sum + c.score, 0);
  const total = Math.max(0, Math.min(rawTotal, 100));
  const { verdict, verdictColor } = getVerdict(total);

  const totalFeedback = categories.flatMap((c) => c.feedback);
  const summary =
    totalFeedback.length === 0
      ? "Outstanding system design! All criteria met."
      : `${totalFeedback.length} suggestion${totalFeedback.length > 1 ? "s" : ""} for improvement.`;

  return { total, categories, verdict, verdictColor, summary };
}
