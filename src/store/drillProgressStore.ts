import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Self-rated drill progress: ids the user has marked as "got it". Persisted so
 *  the library shows what's left to review across sessions. */
interface DrillProgressState {
  known: string[];
  isKnown: (id: string) => boolean;
  toggleKnown: (id: string) => void;
  reset: () => void;
}

export const useDrillProgressStore = create<DrillProgressState>()(
  persist(
    (set, get) => ({
      known: [],
      isKnown: (id) => get().known.includes(id),
      toggleKnown: (id) =>
        set((s) => ({
          known: s.known.includes(id) ? s.known.filter((x) => x !== id) : [...s.known, id],
        })),
      reset: () => set({ known: [] }),
    }),
    { name: "systemdesign-drills" }
  )
);
