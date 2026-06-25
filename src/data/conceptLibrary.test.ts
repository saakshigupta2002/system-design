import { describe, it, expect } from "vitest";
import { getConceptByComponentId } from "./conceptLibrary";
import { conceptForFeedback } from "./feedbackLinks";
import { SYSTEM_COMPONENTS } from "./components";

describe("concept coverage via role fallback", () => {
  it("resolves brand/cloud components to their role's concept", () => {
    expect(getConceptByComponentId("redis")?.componentId).toBe("cache");
    expect(getConceptByComponentId("kafka")?.componentId).toBe("message-queue");
    expect(getConceptByComponentId("postgresql")?.componentId).toBe("sql-db");
    expect(getConceptByComponentId("aws-dynamodb")?.componentId).toBe("nosql-db");
  });

  it("covers (almost) every shipped component now", () => {
    const uncovered = SYSTEM_COMPONENTS.filter((c) => !getConceptByComponentId(c.id)).map((c) => c.id);
    // A handful of niche roles may still lack an entry; coverage should be high.
    expect(uncovered.length).toBeLessThan(SYSTEM_COMPONENTS.length * 0.25);
  });
});

describe("conceptForFeedback", () => {
  it("maps feedback to a role that has a concept", () => {
    expect(conceptForFeedback("Add a caching layer (Redis/Memcached)")).toBe("cache");
    expect(conceptForFeedback("Add a Load Balancer to distribute traffic")).toBe("load-balancer");
    expect(conceptForFeedback("Add a Message Queue for async processing")).toBe("message-queue");
    expect(conceptForFeedback("nothing relevant here")).toBeNull();
  });
});
