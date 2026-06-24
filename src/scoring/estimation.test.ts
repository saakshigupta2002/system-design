import { describe, it, expect } from "vitest";
import {
  parseMultiplier,
  parseBytes,
  referenceTargets,
  gradeEstimation,
} from "./estimation";
import type { Problem } from "@/types/problem";

function problem(readsPerSec: number, writesPerSec: number): Problem {
  return {
    id: "t", title: "T", difficulty: "Easy", description: "",
    requirements: { readsPerSec, writesPerSec, storageGB: 100, latencyMs: 200, users: "" },
    constraints: [], hints: [], referenceSolution: { nodes: [], edges: [] }, tags: [],
  };
}

describe("estimation parsers", () => {
  it("parses peak multipliers from free text", () => {
    expect(parseMultiplier("3x average during business hours")).toBe(3);
    expect(parseMultiplier("5x during major events")).toBe(5);
    expect(parseMultiplier("no number here")).toBe(3); // default
    expect(parseMultiplier(undefined)).toBe(3);
  });

  it("parses bytes-per-item from free text (binary units)", () => {
    expect(parseBytes("~500 bytes per URL record")).toBe(500);
    expect(parseBytes("~1 KB per tweet (text + metadata)")).toBe(1024);
    expect(parseBytes("~200 bytes per message")).toBe(200);
    expect(parseBytes("Average video: 300 MB original")).toBe(300 * 1024 ** 2);
    expect(parseBytes(undefined)).toBe(1024); // default
  });
});

describe("referenceTargets", () => {
  it("derives peak QPS and storage from requirements + hints", () => {
    const t = referenceTargets(problem(100_000, 1_000), {
      peakMultiplier: "3x",
      storagePerItem: "~500 bytes per record",
    });
    expect(t.avgQps).toBe(101_000);
    expect(t.peakQps).toBe(303_000);
    expect(t.bytesPerItem).toBe(500);
    // 1000 writes/s * 31.536M s/yr * 500 bytes
    expect(t.storagePerYearBytes).toBeCloseTo(1_000 * 31_536_000 * 500, -6);
    expect(t.peakBandwidthBps).toBe(303_000 * 500 * 8);
  });
});

describe("gradeEstimation", () => {
  const p = problem(100_000, 1_000);
  const hints = { peakMultiplier: "3x", storagePerItem: "~500 bytes" };

  it("marks an order-of-magnitude estimate as passed (close)", () => {
    const ref = referenceTargets(p, hints);
    const g = gradeEstimation({ peakQps: ref.peakQps * 3 }, p, hints); // 3x off
    const peak = g.items.find((i) => i.key === "peakQps")!;
    expect(peak.verdict).toBe("close");
  });

  it("marks a spot-on estimate and counts it as passed", () => {
    const ref = referenceTargets(p, hints);
    const g = gradeEstimation(
      { peakQps: ref.peakQps, storagePerYearBytes: ref.storagePerYearBytes, peakBandwidthBps: ref.peakBandwidthBps },
      p,
      hints
    );
    expect(g.passed).toBe(3);
    expect(g.items.every((i) => i.verdict === "spot-on")).toBe(true);
  });

  it("flags a wildly wrong estimate as off, and a missing one as missing", () => {
    const ref = referenceTargets(p, hints);
    const g = gradeEstimation({ peakQps: ref.peakQps * 1000 }, p, hints);
    expect(g.items.find((i) => i.key === "peakQps")!.verdict).toBe("off");
    expect(g.items.find((i) => i.key === "storagePerYearBytes")!.verdict).toBe("missing");
  });
});
