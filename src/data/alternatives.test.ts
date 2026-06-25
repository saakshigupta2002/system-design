import { describe, it, expect } from "vitest";
import { PROBLEMS } from "./problems";
import { getComponentById } from "./components";

describe("alternative approaches", () => {
  it("every alternative has a name and a note", () => {
    for (const p of PROBLEMS) {
      for (const alt of p.alternatives ?? []) {
        expect(alt.name.length, `${p.id} alt name`).toBeGreaterThan(0);
        expect(alt.note.length, `${p.id}/${alt.name} note`).toBeGreaterThan(0);
      }
    }
  });

  it("loadable alternative diagrams reference real components and valid edges", () => {
    let loadableCount = 0;
    for (const p of PROBLEMS) {
      for (const alt of p.alternatives ?? []) {
        if (!alt.solution) continue;
        loadableCount++;
        const ids = new Set(alt.solution.nodes.map((n) => n.componentId));
        for (const n of alt.solution.nodes) {
          expect(getComponentById(n.componentId), `${p.id}/${alt.name}: ${n.componentId}`).toBeTruthy();
        }
        for (const e of alt.solution.edges) {
          expect(ids.has(e.source), `${p.id}/${alt.name} edge source ${e.source}`).toBe(true);
          expect(ids.has(e.target), `${p.id}/${alt.name} edge target ${e.target}`).toBe(true);
        }
      }
    }
    expect(loadableCount).toBeGreaterThan(0); // at least one loadable diagram ships
  });
});
