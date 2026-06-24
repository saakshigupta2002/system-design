import { describe, it, expect } from "vitest";
import { scoreDesign } from "./scorer";
import { makeNode, makeEdge } from "@/test-helpers";
import type { Problem } from "@/types/problem";

// Same topology, once with generic components and once with the real products a
// learner would actually name. Before the role layer the brand stack scored far
// lower (none of the ids matched the rules); now they should be ~equivalent.
const TOPOLOGY: Array<[string, string]> = [
  ["c", "dns"],
  ["dns", "cdn"],
  ["cdn", "lb"],
  ["lb", "gw"],
  ["gw", "app"],
  ["app", "cache"],
  ["app", "db"],
  ["app", "q"],
  ["app", "mon"],
];
const edges = TOPOLOGY.map(([s, t]) => makeEdge(s, t));

const GENERIC = {
  c: "client", dns: "dns", cdn: "cdn", lb: "load-balancer", gw: "api-gateway",
  app: "app-server", cache: "cache", db: "sql-db", q: "message-queue", mon: "monitoring",
};
const BRAND = {
  c: "client", dns: "aws-route53", cdn: "cloudflare", lb: "nginx", gw: "kong",
  app: "nodejs", cache: "redis", db: "postgresql", q: "kafka", mon: "prometheus",
};

function build(map: Record<string, string>) {
  return Object.entries(map).map(([id, componentId]) =>
    makeNode(id, componentId, { replicas: 2 })
  );
}

describe("scoreDesign — brand components are no longer penalised", () => {
  it("scores a brand-name stack on par with the equivalent generic stack", () => {
    const generic = scoreDesign(build(GENERIC), edges).total;
    const brand = scoreDesign(build(BRAND), edges).total;
    expect(brand).toBeGreaterThan(60); // earns real credit, not ~0
    expect(Math.abs(brand - generic)).toBeLessThanOrEqual(10);
  });
});

function problem(readsPerSec: number, writesPerSec: number, latencyMs: number): Problem {
  return {
    id: "test", title: "Test", difficulty: "Easy", description: "",
    requirements: { readsPerSec, writesPerSec, storageGB: 1, latencyMs, users: "" },
    constraints: [], hints: [], referenceSolution: { nodes: [], edges: [] }, tags: [],
  };
}

describe("scoreDesign — problem-aware grading", () => {
  const undersized = [
    makeNode("c", "client"),
    makeNode("app", "app-server", { maxQPS: 1_000_000 }),
    makeNode("db", "sql-db"), // 10K QPS ceiling
  ];
  const dbEdges = [makeEdge("c", "app"), makeEdge("app", "db")];

  it("flags insufficient capacity at the problem's required load", () => {
    const res = scoreDesign(undersized, dbEdges, problem(30_000, 0, 500));
    const scal = res.categories.find((c) => c.category === "Scalability")!;
    expect(scal.feedback.join(" ")).toMatch(/simulated throughput/i);
  });

  it("credits capacity when the design sustains the required load", () => {
    const res = scoreDesign(undersized, dbEdges, problem(1_000, 0, 500));
    const scal = res.categories.find((c) => c.category === "Scalability")!;
    expect(scal.passed.join(" ")).toMatch(/sustains the required/i);
  });

  it("fails the latency SLA when the critical path is too slow", () => {
    const res = scoreDesign(undersized, dbEdges, problem(1_000, 0, 5));
    const lat = res.categories.find((c) => c.category === "Latency")!;
    expect(lat.feedback.join(" ")).toMatch(/simulated critical-path latency/i);
  });

  it("passes the latency SLA when the critical path is within target", () => {
    const res = scoreDesign(undersized, dbEdges, problem(1_000, 0, 500));
    const lat = res.categories.find((c) => c.category === "Latency")!;
    expect(lat.passed.join(" ")).toMatch(/within the < 500ms SLA/i);
  });
});
