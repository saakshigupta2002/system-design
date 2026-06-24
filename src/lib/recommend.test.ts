import { describe, it, expect } from "vitest";
import { computeFocusArea, recommendRetry } from "./recommend";
import type { ScoreEntry } from "@/store/scoreHistoryStore";

function entry(problemId: string, total: number, cats: [string, number, number][]): ScoreEntry {
  return {
    problemId,
    total,
    verdict: "x",
    timestamp: Date.now(),
    categories: cats.map(([c, s, m]) => ({ c, s, m })),
  };
}

describe("computeFocusArea", () => {
  it("returns null without category data", () => {
    expect(computeFocusArea([])).toBeNull();
    expect(computeFocusArea([{ problemId: "p", total: 50, verdict: "x", timestamp: 1 }])).toBeNull();
  });

  it("identifies the consistently weakest category", () => {
    const entries = [
      entry("a", 60, [["Scalability", 18, 20], ["Availability", 6, 20], ["Latency", 17, 20]]),
      entry("b", 62, [["Scalability", 19, 20], ["Availability", 7, 20], ["Latency", 16, 20]]),
    ];
    const focus = computeFocusArea(entries)!;
    expect(focus.category).toBe("Availability");
    expect(focus.drillCategory).toBe("failure");
    expect(focus.avgPct).toBeLessThan(0.5);
  });

  it("returns null when everything is strong (>=75%)", () => {
    const entries = [entry("a", 95, [["Scalability", 19, 20], ["Availability", 18, 20]])];
    expect(computeFocusArea(entries)).toBeNull();
  });
});

describe("recommendRetry", () => {
  it("picks the lowest sub-71 problem by best attempt", () => {
    const entries = [
      entry("a", 40, []),
      entry("a", 55, []), // best for a = 55
      entry("b", 30, []),
      entry("c", 80, []), // already strong, excluded
    ];
    expect(recommendRetry(entries)).toEqual({ problemId: "b", total: 30 });
  });

  it("returns null when all problems are strong", () => {
    expect(recommendRetry([entry("a", 90, []), entry("b", 75, [])])).toBeNull();
  });
});
