import { describe, it, expect } from "vitest";
import { INTERVIEW_DATA, getInterviewData } from "./interviewData";
import { PROBLEMS } from "./problems";

describe("interview data coverage", () => {
  it("has an answer key for every built-in problem", () => {
    const missing = PROBLEMS.filter((p) => !getInterviewData(p.id)).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it("every entry is well-formed (requirements, APIs, data model, follow-ups, hints)", () => {
    for (const d of INTERVIEW_DATA) {
      expect(d.requirements.length, `${d.problemId} requirements`).toBeGreaterThan(0);
      expect(d.referenceAPIs.length, `${d.problemId} APIs`).toBeGreaterThan(0);
      expect(d.dataModel.length, `${d.problemId} dataModel`).toBeGreaterThan(0);
      expect(d.followUpQuestions.length, `${d.problemId} followUps`).toBeGreaterThan(0);
      expect(d.estimationHints.dailyActiveUsers.length, `${d.problemId} hints`).toBeGreaterThan(0);
      // Data model entities should declare a partition key where applicable.
      for (const e of d.dataModel) {
        expect(e.fields.length, `${d.problemId}/${e.name} fields`).toBeGreaterThan(0);
      }
    }
  });

  it("references no duplicate problemIds", () => {
    const ids = INTERVIEW_DATA.map((d) => d.problemId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
