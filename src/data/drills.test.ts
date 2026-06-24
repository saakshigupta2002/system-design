import { describe, it, expect } from "vitest";
import { DRILLS, filterDrills } from "./drills";

describe("drills", () => {
  it("builds a non-trivial drill bank from the follow-up Q&A", () => {
    expect(DRILLS.length).toBeGreaterThan(50);
    // Every drill is fully populated and tagged.
    for (const d of DRILLS) {
      expect(d.question.length).toBeGreaterThan(0);
      expect(d.answer.length).toBeGreaterThan(0);
      expect(["Easy", "Medium", "Hard"]).toContain(d.difficulty);
      expect(["failure", "scale", "consistency", "security", "optimization"]).toContain(d.category);
    }
  });

  it("filters by category, difficulty, and search", () => {
    const consistency = filterDrills({ category: "consistency" });
    expect(consistency.every((d) => d.category === "consistency")).toBe(true);
    expect(consistency.length).toBeGreaterThan(0);

    const hard = filterDrills({ difficulty: "Hard" });
    expect(hard.every((d) => d.difficulty === "Hard")).toBe(true);

    const cacheSearch = filterDrills({ search: "cache" });
    expect(cacheSearch.length).toBeGreaterThan(0);
    expect(cacheSearch.length).toBeLessThan(DRILLS.length);
  });
});
