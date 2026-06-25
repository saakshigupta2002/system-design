import type { Node, Edge } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";
import type { CategoryScore } from "@/types/scoring";
import type { Problem } from "@/types/problem";
import { roleOf, rolesPresent, DATABASE_ROLES, type ComponentRole } from "@/data/roles";

/**
 * Per-problem fit. Generic rules ("add a cache") apply everywhere; this layer
 * sharpens feedback to *this* problem by (a) deriving the roles the problem's
 * reference solution relies on and flagging the ones you're missing, and
 * (b) detecting workload anti-patterns from the stated requirements (read/write
 * ratio, scale, latency SLA, storage volume). Works for every built-in problem
 * because they all ship a reference solution — no extra authoring required.
 */

// Ubiquitous roles that aren't informative as a "must-have".
const TRIVIAL_ROLES = new Set<ComponentRole>(["client"]);

function roleLabel(r: ComponentRole): string {
  return r.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function compactNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 ? 1 : 0)}K`;
  return `${Math.round(n)}`;
}

/** Workload-aware anti-patterns: concrete, problem-specific warnings. */
function detectAntiPatterns(problem: Problem, roles: Set<ComponentRole>): string[] {
  const out: string[] = [];
  const { readsPerSec, writesPerSec, latencyMs, storageGB } = problem.requirements;
  const hasCache = roles.has("cache");
  const hasCDN = roles.has("cdn");
  const hasLB = roles.has("load-balancer");
  const hasQueue = roles.has("message-queue") || roles.has("pub-sub");
  const hasDB = [...DATABASE_ROLES].some((r) => roles.has(r));
  const hasNoSQL = roles.has("nosql-db");
  const hasBlobStore = roles.has("object-storage") || roles.has("data-warehouse") || roles.has("file-store");

  const ratio = writesPerSec > 0 ? readsPerSec / writesPerSec : readsPerSec;

  if (ratio >= 5 && hasDB && !hasCache) {
    out.push(
      `Read-heavy workload (~${Math.round(ratio)}:1 read/write) but no cache — those reads will hammer the database. Add a cache in front.`
    );
  }
  if (writesPerSec >= 20_000 && !hasNoSQL && !hasQueue) {
    out.push(
      `Very high write rate (~${compactNum(writesPerSec)}/s) on this design — a single relational primary will bottleneck. Shard, use NoSQL, or buffer writes through a queue.`
    );
  }
  if (latencyMs > 0 && latencyMs <= 50 && !hasCache && !hasCDN) {
    out.push(
      `Tight latency SLA (<${latencyMs}ms) but neither a cache nor a CDN — serving from disk/origin makes this hard to hit.`
    );
  }
  if (readsPerSec + writesPerSec >= 100_000 && !hasLB) {
    out.push(
      `~${compactNum(readsPerSec + writesPerSec)} req/s with no load balancer — a single entry point can't distribute that load.`
    );
  }
  if (storageGB >= 50_000 && !hasBlobStore) {
    out.push(
      `Large data volume (~${compactNum(storageGB)} GB) with no object storage / warehouse — bulk or blob data doesn't belong in a primary DB.`
    );
  }
  return out;
}

const COVERAGE_POINTS = 12;
const ANTIPATTERN_POINTS = 8;
const MAX = COVERAGE_POINTS + ANTIPATTERN_POINTS;

export function scoreProblemFit(
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  problem: Problem
): CategoryScore {
  const feedback: string[] = [];
  const passed: string[] = [];
  let score = 0;

  const refRoles = [
    ...new Set(
      problem.referenceSolution.nodes
        .map((n) => roleOf(n.componentId))
        .filter((r) => !TRIVIAL_ROLES.has(r))
    ),
  ];
  const userRoles = rolesPresent(nodes.map((n) => n.data.componentId));

  // Reference-role coverage (12 pts)
  if (refRoles.length === 0) {
    score += COVERAGE_POINTS; // no reference to compare against
  } else {
    const missing = refRoles.filter((r) => !userRoles.has(r));
    const covered = refRoles.length - missing.length;
    score += Math.round((covered / refRoles.length) * COVERAGE_POINTS);
    if (missing.length === 0) {
      passed.push("Covers every role this problem's reference design relies on");
    } else {
      feedback.push(
        `This problem's reference design relies on roles you're missing: ${missing.map(roleLabel).join(", ")}.`
      );
    }
  }

  // Workload anti-patterns (8 pts; -2 each)
  const antiPatterns = detectAntiPatterns(problem, userRoles);
  score += Math.max(0, ANTIPATTERN_POINTS - antiPatterns.length * 2);
  if (antiPatterns.length === 0) {
    passed.push("No workload anti-patterns for this problem's read/write profile");
  } else {
    feedback.push(...antiPatterns);
  }

  return {
    category: "Problem Fit",
    score: Math.max(0, Math.min(score, MAX)),
    maxScore: MAX,
    feedback,
    passed,
  };
}
