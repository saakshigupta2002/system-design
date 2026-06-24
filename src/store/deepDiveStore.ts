import { create } from "zustand";
import { persist } from "zustand/middleware";

/** The user's back-of-envelope assumptions for a problem (the calculator's
 *  inputs), persisted so the graded estimate survives reloads and Advanced
 *  scoring (Phase 3) can read it. */
export interface EstimationInputs {
  dau: number;
  reqPerUser: number;
  writeRatio: number;
  dataSizeKB: number;
}

/** Per-problem Advanced-mode work. Estimation lands in Phase 2; API / data
 *  model / consistency capture are added in Phase 3. */
export interface DeepDiveEntry {
  estimation?: EstimationInputs;
}

interface DeepDiveState {
  byProblem: Record<string, DeepDiveEntry>;
  getEntry: (problemId: string) => DeepDiveEntry | undefined;
  setEstimation: (problemId: string, inputs: EstimationInputs) => void;
}

export const useDeepDiveStore = create<DeepDiveState>()(
  persist(
    (set, get) => ({
      byProblem: {},
      getEntry: (problemId) => get().byProblem[problemId],
      setEstimation: (problemId, estimation) =>
        set((s) => ({
          byProblem: {
            ...s.byProblem,
            [problemId]: { ...s.byProblem[problemId], estimation },
          },
        })),
    }),
    { name: "systemdesign-deepdive" }
  )
);
