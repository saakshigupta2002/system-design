import { describe, it, expect } from "vitest";
import { buildDeepDiveReviewPrompt } from "./deepDiveReview";
import type { Problem } from "@/types/problem";
import type { DeepDiveEntry } from "@/types/deepDive";

const problem: Problem = {
  id: "url-shortener", title: "URL Shortener", difficulty: "Easy",
  description: "Shorten long URLs",
  requirements: { readsPerSec: 100000, writesPerSec: 1000, storageGB: 1000, latencyMs: 100, users: "100M DAU" },
  constraints: [], hints: [], referenceSolution: { nodes: [], edges: [] }, tags: [],
};

describe("buildDeepDiveReviewPrompt", () => {
  it("includes the problem, the user's choices, and the consistency justification", () => {
    const entry: DeepDiveEntry = {
      apis: [{ method: "POST", path: "/urls" }, { method: "GET", path: "/{code}" }],
      entities: [{ name: "urls", type: "nosql", partitionKey: "short_code" }],
      consistency: "strong",
      consistencyNote: "redirects must read the latest mapping",
    };
    const { system, user } = buildDeepDiveReviewPrompt(problem, entry);
    expect(system).toMatch(/consistency/i);
    expect(user).toContain("URL Shortener");
    expect(user).toContain("POST /urls");
    expect(user).toContain("partition key: short_code");
    expect(user).toContain("redirects must read the latest mapping");
  });

  it("handles an empty entry gracefully", () => {
    const { user } = buildDeepDiveReviewPrompt(problem, {});
    expect(user).toContain("(none provided)");
    expect(user).toMatch(/consistency choice: \(none\)/i);
  });
});
