import { describe, it, expect } from "vitest";
import { runSimulation } from "./simulator";
import { makeNode, makeEdge } from "@/test-helpers";

describe("runSimulation — role awareness", () => {
  it("treats a brand load balancer (Nginx) as a traffic splitter", () => {
    // client → nginx → {app1, app2}. A splitter sends each request down one
    // branch, so the two app servers should each see ~half the load.
    const nodes = [
      makeNode("c", "client"),
      makeNode("lb", "nginx"),
      makeNode("a1", "app-server"),
      makeNode("a2", "app-server"),
    ];
    const edges = [
      makeEdge("c", "lb"),
      makeEdge("lb", "a1"),
      makeEdge("lb", "a2"),
    ];
    const res = runSimulation(nodes, edges, 1000);
    expect(res.nodeMetrics.get("a1")!.incomingQPS).toBeCloseTo(500, 5);
    expect(res.nodeMetrics.get("a2")!.incomingQPS).toBeCloseTo(500, 5);
  });

  it("treats Redis as a cache that absorbs its hit rate", () => {
    // client → app → redis → postgres. Only cache misses (default 20%) should
    // reach the database behind the cache.
    const nodes = [
      makeNode("c", "client"),
      makeNode("app", "app-server"),
      makeNode("r", "redis"),
      makeNode("db", "postgresql"),
    ];
    const edges = [
      makeEdge("c", "app"),
      makeEdge("app", "r"),
      makeEdge("r", "db"),
    ];
    const res = runSimulation(nodes, edges, 1000);
    // 1000 in → app → redis (1000) → 20% miss → 200 to postgres.
    expect(res.nodeMetrics.get("db")!.incomingQPS).toBeCloseTo(200, 5);
  });

  it("caps throughput at an undersized datastore (capacity bottleneck)", () => {
    // sql-db maxQPS is 10,000; push 30,000 through it.
    const nodes = [
      makeNode("c", "client"),
      makeNode("app", "app-server", { maxQPS: 1_000_000 }),
      makeNode("db", "sql-db"),
    ];
    const edges = [makeEdge("c", "app"), makeEdge("app", "db")];
    const res = runSimulation(nodes, edges, 30_000);
    expect(res.throughput).toBeLessThan(30_000);
    expect(res.bottleneckNodes).toContain("db");
  });

  it("reports a p99 tail above p50, and a worse tail under load", () => {
    const mk = (rps: number) =>
      runSimulation(
        [makeNode("c", "client"), makeNode("app", "app-server"), makeNode("db", "sql-db")],
        [makeEdge("c", "app"), makeEdge("app", "db")],
        rps
      );
    const light = mk(1000);
    expect(light.p99LatencyMs).toBeGreaterThan(light.p50LatencyMs);
    const heavy = mk(40_000); // saturates the 10K sql-db
    expect(heavy.p99LatencyMs).toBeGreaterThan(light.p99LatencyMs);
  });

  it("flags a storage shortfall when the tier can't hold the required volume", () => {
    const nodes = [makeNode("c", "client"), makeNode("app", "app-server"), makeNode("db", "sql-db")];
    const edges = [makeEdge("c", "app"), makeEdge("app", "db")];
    // sql-db illustrative capacity is 5,000 GB; ask for 1,000,000 GB.
    const short = runSimulation(nodes, edges, 1000, new Set(), 1_000_000);
    expect(short.storageOk).toBe(false);
    expect(short.warnings.join(" ")).toMatch(/storage shortfall/i);
    // Object storage easily covers it.
    const ok = runSimulation(
      [...nodes, makeNode("s3", "object-storage")],
      edges,
      1000,
      new Set(),
      1_000_000
    );
    expect(ok.storageOk).toBe(true);
  });

  it("keeps an off-path queue out of the user-facing latency total", () => {
    // app → message-queue is async work; it shouldn't add to critical-path
    // latency even though the queue has a base latency.
    const withoutQueue = runSimulation(
      [makeNode("c", "client"), makeNode("app", "app-server")],
      [makeEdge("c", "app")],
      100
    );
    const withQueue = runSimulation(
      [makeNode("c", "client"), makeNode("app", "app-server"), makeNode("q", "kafka")],
      [makeEdge("c", "app"), makeEdge("app", "q")],
      100
    );
    expect(withQueue.totalLatencyMs).toBeCloseTo(withoutQueue.totalLatencyMs, 5);
  });
});
