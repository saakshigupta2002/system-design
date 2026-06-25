import { describe, it, expect } from "vitest";
import { scoreDeepDive } from "./deepDive";
import { getProblemById } from "@/data/problems";
import { getInterviewData } from "@/data/interviewData";
import type { DeepDiveEntry, EntityStoreType } from "@/types/deepDive";
import type { Problem } from "@/types/problem";

const problem = getProblemById("url-shortener")!;
const idata = getInterviewData("url-shortener")!;

describe("scoreDeepDive", () => {
  it("gives a low score with actionable feedback for an empty entry", () => {
    const r = scoreDeepDive({}, problem);
    expect(r.category).toBe("Deep-Dive");
    expect(r.score).toBeLessThanOrEqual(5);
    expect(r.feedback.join(" ")).toMatch(/API endpoints/i);
    expect(r.feedback.join(" ")).toMatch(/consistency/i);
  });

  it("scores high when the entry covers the reference APIs, entities, and choices", () => {
    const entry: DeepDiveEntry = {
      estimation: { dau: 100_000_000, reqPerUser: 87, writeRatio: 0.01, dataSizeKB: 1 },
      apis: idata.referenceAPIs.map((a) => ({ method: a.method, path: a.path })),
      entities: idata.dataModel.map((e) => ({
        name: e.name,
        type: e.type as EntityStoreType,
        partitionKey: e.partitionKey ?? "id",
      })),
      consistency: "strong",
      consistencyNote: "redirects need a strong read of the code→url mapping",
    };
    const r = scoreDeepDive(entry, problem);
    expect(r.score).toBeGreaterThanOrEqual(16);
    expect(r.passed.join(" ")).toMatch(/API surface/i);
  });

  it("rewards API coverage proportionally — half the endpoints scores less than all", () => {
    const all = idata.referenceAPIs.map((a) => ({ method: a.method, path: a.path }));
    const half = all.slice(0, Math.ceil(all.length / 2));
    const base: DeepDiveEntry = { entities: [], consistency: "" };
    const full = scoreDeepDive({ ...base, apis: all }, problem).score;
    const partial = scoreDeepDive({ ...base, apis: half }, problem).score;
    expect(full).toBeGreaterThan(partial);
  });

  it("falls back to heuristics for a problem without an answer key", () => {
    // A synthetic problem id not present in INTERVIEW_DATA exercises the fallback.
    const p: Problem = {
      id: "synthetic-no-key", title: "Synthetic", difficulty: "Easy", description: "",
      requirements: { readsPerSec: 1000, writesPerSec: 1000, storageGB: 100, latencyMs: 200, users: "" },
      constraints: [], hints: [], referenceSolution: { nodes: [], edges: [] }, tags: [],
    };
    expect(getInterviewData(p.id)).toBeUndefined();
    const entry: DeepDiveEntry = {
      apis: [
        { method: "POST", path: "/pastes" },
        { method: "GET", path: "/pastes/:id" },
        { method: "DELETE", path: "/pastes/:id" },
      ],
      entities: [
        { name: "paste", type: "nosql", partitionKey: "id" },
        { name: "user", type: "sql", partitionKey: "user_id" },
      ],
      consistency: "eventual",
      consistencyNote: "reads can tolerate slight staleness",
    };
    const r = scoreDeepDive(entry, p);
    expect(r.score).toBeGreaterThan(10);
  });
});
