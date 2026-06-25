import { describe, it, expect } from "vitest";
import { scoreProblemFit } from "./problemFit";
import { makeNode, makeEdge } from "@/test-helpers";
import type { Problem } from "@/types/problem";

function problem(opts: Partial<Problem["requirements"]> & { ref: string[] }): Problem {
  const { ref, ...req } = opts;
  return {
    id: "t", title: "T", difficulty: "Medium", description: "",
    requirements: {
      readsPerSec: 100_000, writesPerSec: 1_000, storageGB: 100, latencyMs: 200, users: "",
      ...req,
    },
    constraints: [], hints: [],
    referenceSolution: { nodes: ref.map((c, i) => ({ componentId: c, x: i * 100, y: 0 })), edges: [] },
    tags: [],
  };
}

const REF = ["client", "load-balancer", "app-server", "cache", "sql-db"];

describe("scoreProblemFit", () => {
  it("flags missing reference roles and the read-heavy no-cache anti-pattern", () => {
    const p = problem({ ref: REF, readsPerSec: 100_000, writesPerSec: 1_000 });
    const nodes = [makeNode("c", "client"), makeNode("a", "app-server"), makeNode("d", "sql-db")];
    const r = scoreProblemFit(nodes, [makeEdge("c", "a"), makeEdge("a", "d")], p);
    const fb = r.feedback.join(" ");
    expect(fb).toMatch(/reference design relies on roles you're missing/i);
    expect(fb).toMatch(/Cache/); // missing role
    expect(fb).toMatch(/read-heavy/i); // anti-pattern
    expect(r.score).toBeLessThan(r.maxScore);
  });

  it("awards full marks when the design covers the reference and has no anti-patterns", () => {
    const p = problem({ ref: REF });
    const nodes = [
      makeNode("c", "client"), makeNode("lb", "load-balancer"),
      makeNode("a", "app-server"), makeNode("ca", "cache"), makeNode("d", "sql-db"),
    ];
    const r = scoreProblemFit(nodes, [], p);
    expect(r.score).toBe(r.maxScore);
    expect(r.passed.join(" ")).toMatch(/covers every role/i);
  });

  it("detects a tight-SLA-without-cache anti-pattern", () => {
    const p = problem({ ref: ["client", "app-server"], readsPerSec: 1000, writesPerSec: 1000, latencyMs: 20 });
    const nodes = [makeNode("c", "client"), makeNode("a", "app-server")];
    const r = scoreProblemFit(nodes, [], p);
    expect(r.feedback.join(" ")).toMatch(/latency SLA/i);
  });

  it("detects a write-heavy anti-pattern", () => {
    const p = problem({ ref: ["client", "app-server"], readsPerSec: 1000, writesPerSec: 40_000 });
    const nodes = [makeNode("c", "client"), makeNode("a", "app-server"), makeNode("d", "sql-db")];
    const r = scoreProblemFit(nodes, [], p);
    expect(r.feedback.join(" ")).toMatch(/high write rate/i);
  });
});
