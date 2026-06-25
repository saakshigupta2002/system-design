export interface ProblemRequirements {
  readsPerSec: number;
  writesPerSec: number;
  storageGB: number;
  latencyMs: number;
  users: string; // e.g. "100M DAU"
}

export interface ProblemHint {
  title: string;
  content: string;
}

export interface ReferenceSolution {
  nodes: Array<{ componentId: string; x: number; y: number }>;
  edges: Array<{ source: string; target: string }>;
}

/** A valid alternative approach to a problem — there's rarely one right answer.
 *  Short text, shown alongside the reference so learners see the design space. */
export interface AlternativeApproach {
  name: string;
  note: string;
  /** Optional loadable diagram for this approach (same shape as the reference). */
  solution?: ReferenceSolution;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  requirements: ProblemRequirements;
  constraints: string[];
  hints: ProblemHint[];
  referenceSolution: ReferenceSolution;
  tags: string[];
  /** Optional: 2–3 alternative architectures with their trade-offs. */
  alternatives?: AlternativeApproach[];
}
