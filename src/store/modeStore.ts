import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Beginner = today's boxes-and-arrows experience. Advanced layers the
 *  deep-dive steps (estimation, API/data-model, consistency, deep-dive Q&A)
 *  onto the same problem. The chosen mode is persisted across sessions. */
export type SkillMode = "beginner" | "advanced";

interface ModeState {
  skillMode: SkillMode;
  /** False until the user picks a mode once (drives the first-run dialog). */
  hasChosenMode: boolean;
  setSkillMode: (mode: SkillMode) => void;
  chooseMode: (mode: SkillMode) => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      skillMode: "beginner",
      hasChosenMode: false,
      setSkillMode: (mode) => set({ skillMode: mode }),
      chooseMode: (mode) => set({ skillMode: mode, hasChosenMode: true }),
    }),
    {
      name: "systemdesign-mode",
    }
  )
);

/** True when the deep-dive surfaces (estimation, API/schema, etc.) should show. */
export function isAdvanced(): boolean {
  return useModeStore.getState().skillMode === "advanced";
}
