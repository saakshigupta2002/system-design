import type { Problem } from "@/types/problem";
import type { CategoryScore } from "@/types/scoring";
import type { DeepDiveEntry, UserApi } from "@/types/deepDive";
import { getInterviewData, type ReferenceAPI } from "@/data/interviewData";
import { estimateOutputs, gradeEstimation } from "./estimation";

/**
 * Grades the Advanced-mode deep-dive work — estimation, API design, data model
 * (incl. partition keys), and the consistency choice — against the problem's
 * reference answer key (interviewData) where one exists, and against sensible
 * heuristics where it doesn't. Returns a single "Deep-Dive" category (max 20)
 * the scorer folds into the Advanced score.
 */

const MAX = { estimation: 5, api: 6, dataModel: 6, consistency: 3 };

/** Meaningful path tokens: lowercase, dropping version/api prefixes and params
 *  ({id}, :id, *), so "GET /api/v1/urls/{shortCode}" → ["urls"]. */
function pathTokens(path: string): string[] {
  return path
    .split("?")[0]
    .split("/")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((t) => !/^v\d+$/.test(t) && t !== "api")
    .filter((t) => !(t.startsWith(":") || (t.startsWith("{") && t.endsWith("}")) || t === "*"));
}

function apiMatches(u: UserApi, r: ReferenceAPI): boolean {
  if (u.method.toUpperCase() !== r.method.toUpperCase()) return false;
  const userTokens = new Set(pathTokens(u.path));
  const refTokens = pathTokens(r.path);
  // Param-only / root reference paths (e.g. "/{shortCode}") match a user path
  // that is also param-only; otherwise every static ref token must appear.
  if (refTokens.length === 0) return userTokens.size === 0;
  return refTokens.every((t) => userTokens.has(t));
}

function normEntity(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "");
}

function entityMatches(a: string, b: string): boolean {
  const x = normEntity(a);
  const y = normEntity(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

export function scoreDeepDive(entry: DeepDiveEntry, problem: Problem): CategoryScore {
  const idata = getInterviewData(problem.id);
  const feedback: string[] = [];
  const passed: string[] = [];
  let score = 0;

  // ── Estimation (5) ──
  if (entry.estimation) {
    const out = estimateOutputs(entry.estimation);
    const g = gradeEstimation(
      { peakQps: out.peakQps, storagePerYearBytes: out.storagePerYearBytes, peakBandwidthBps: out.peakBandwidthBps },
      problem,
      idata?.estimationHints
    );
    score += Math.round((g.passed / g.total) * MAX.estimation);
    if (g.passed === g.total) passed.push("Capacity estimates are all in the right ballpark");
    else feedback.push(`Estimation: ${g.passed}/${g.total} metrics in range — refine them in the Capacity tab.`);
  } else {
    feedback.push("Estimate the load in the Capacity tab (peak QPS, storage/year, bandwidth) and save it.");
  }

  // ── API design (6) ──
  const userApis = (entry.apis ?? []).filter((a) => a.path.trim());
  const refApis = idata?.referenceAPIs ?? [];
  if (refApis.length > 0) {
    const covered = refApis.filter((r) => userApis.some((u) => apiMatches(u, r)));
    const ratio = covered.length / refApis.length;
    score += Math.round(ratio * MAX.api);
    if (ratio >= 0.99) {
      passed.push("API surface covers the reference endpoints");
    } else if (userApis.length === 0) {
      feedback.push(`Define your API endpoints in the Deep-Dive tab — the reference has ${refApis.length}.`);
    } else {
      const missing = refApis.filter((r) => !userApis.some((u) => apiMatches(u, r)));
      feedback.push(
        `API: covered ${covered.length}/${refApis.length} reference endpoints` +
          (missing.length ? `. Missing e.g. ${missing.slice(0, 2).map((m) => `${m.method} ${m.path}`).join(", ")}` : "") +
          "."
      );
    }
  } else if (userApis.length >= 3) {
    score += MAX.api;
    passed.push(`Defined a clear API surface (${userApis.length} endpoints)`);
  } else if (userApis.length > 0) {
    score += 3;
    feedback.push("Add a few more API endpoints to fully define the interface.");
  } else {
    feedback.push("Define your core API endpoints in the Deep-Dive tab.");
  }

  // ── Data model (6) — entity coverage (4) + partition keys (2) ──
  const userEntities = (entry.entities ?? []).filter((e) => e.name.trim());
  const refEntities = idata?.dataModel ?? [];
  let dmPts = 0;
  if (refEntities.length > 0) {
    const matched = refEntities.filter((r) => userEntities.some((u) => entityMatches(u.name, r.name)));
    dmPts += Math.round((matched.length / refEntities.length) * 4);
  } else {
    dmPts += userEntities.length >= 2 ? 4 : userEntities.length === 1 ? 2 : 0;
  }
  const withPK = userEntities.filter((e) => e.partitionKey.trim()).length;
  const pkFrac = userEntities.length ? withPK / userEntities.length : 0;
  dmPts += Math.round(pkFrac * 2);
  score += Math.min(MAX.dataModel, dmPts);
  if (userEntities.length === 0) {
    feedback.push("Define your data model entities (and a partition/shard key for each) in the Deep-Dive tab.");
  } else if (withPK < userEntities.length) {
    feedback.push("Specify a partition/shard key for every entity — it's how the datastore scales.");
  } else {
    passed.push("Data model defined with partition keys");
  }

  // ── Consistency (3) ──
  if (entry.consistency) {
    if ((entry.consistencyNote ?? "").trim().length >= 10) {
      score += MAX.consistency;
      passed.push("Consistency model chosen and justified");
    } else {
      score += 2;
      feedback.push("Add a one-line justification for your consistency choice.");
    }
  } else {
    feedback.push("Choose a consistency model (strong / eventual / mixed) and justify it.");
  }

  const maxScore = MAX.estimation + MAX.api + MAX.dataModel + MAX.consistency;
  return { category: "Deep-Dive", score: Math.max(0, Math.min(score, maxScore)), maxScore, feedback, passed };
}
