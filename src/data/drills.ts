import { INTERVIEW_DATA } from "./interviewData";
import { PROBLEMS } from "./problems";

/**
 * Deep-dive drills: a standalone practice library of focused conceptual
 * questions, normalized from the per-problem follow-up Q&A in `interviewData`.
 * Each drill is tagged with a category and inherits its source problem's
 * difficulty, so the library can be filtered Easy/Medium/Hard like a question
 * bank — separate from building a full design.
 */

export type DrillCategory = "failure" | "scale" | "consistency" | "security" | "optimization";
export type DrillDifficulty = "Easy" | "Medium" | "Hard";

export interface Drill {
  id: string;
  question: string;
  hint: string;
  answer: string;
  category: DrillCategory;
  difficulty: DrillDifficulty;
  problemId: string;
  problemTitle: string;
}

export const DRILL_CATEGORIES: { value: DrillCategory; label: string }[] = [
  { value: "failure", label: "Failure" },
  { value: "scale", label: "Scale" },
  { value: "consistency", label: "Consistency" },
  { value: "security", label: "Security" },
  { value: "optimization", label: "Optimization" },
];

// Built once from the answer-key follow-ups, joined to problem difficulty/title.
const PROBLEM_META = new Map(
  PROBLEMS.map((p) => [p.id, { title: p.title, difficulty: p.difficulty as DrillDifficulty }])
);

export const DRILLS: Drill[] = INTERVIEW_DATA.flatMap((d) => {
  const meta = PROBLEM_META.get(d.problemId);
  return d.followUpQuestions.map((q) => ({
    id: `${d.problemId}:${q.id}`,
    question: q.question,
    hint: q.hint,
    answer: q.answer,
    category: q.category,
    difficulty: meta?.difficulty ?? "Medium",
    problemId: d.problemId,
    problemTitle: meta?.title ?? d.problemId,
  }));
});

export interface DrillFilter {
  category?: DrillCategory | "all";
  difficulty?: DrillDifficulty | "all";
  search?: string;
}

/** Filter drills by category, difficulty, and a free-text query. */
export function filterDrills(filter: DrillFilter): Drill[] {
  const q = filter.search?.toLowerCase().trim() ?? "";
  return DRILLS.filter((d) => {
    if (filter.category && filter.category !== "all" && d.category !== filter.category) return false;
    if (filter.difficulty && filter.difficulty !== "all" && d.difficulty !== filter.difficulty) return false;
    if (q && !(`${d.question} ${d.problemTitle}`.toLowerCase().includes(q))) return false;
    return true;
  });
}
