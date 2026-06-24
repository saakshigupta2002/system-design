import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DeepDiveEntry, EstimationInputs } from "@/types/deepDive";

export type { DeepDiveEntry, EstimationInputs };

interface DeepDiveState {
  byProblem: Record<string, DeepDiveEntry>;
  getEntry: (problemId: string) => DeepDiveEntry | undefined;
  setEstimation: (problemId: string, inputs: EstimationInputs) => void;
  /** Merge a partial update (apis / entities / consistency …) for a problem. */
  updateEntry: (problemId: string, patch: Partial<DeepDiveEntry>) => void;
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
      updateEntry: (problemId, patch) =>
        set((s) => ({
          byProblem: {
            ...s.byProblem,
            [problemId]: { ...s.byProblem[problemId], ...patch },
          },
        })),
    }),
    { name: "systemdesign-deepdive" }
  )
);
