import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TOUR_STEPS } from "@/data/tourSteps";

interface TourState {
  /** Whether the tour overlay is currently showing. */
  active: boolean;
  /** Current step index into TOUR_STEPS. */
  step: number;
  /** Persisted: true once the tour has been seen or skipped. Gates auto-start. */
  hasSeenTour: boolean;
  start: () => void;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  stop: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      active: false,
      step: 0,
      hasSeenTour: false,
      start: () => set({ active: true, step: 0 }),
      next: () => {
        const n = get().step + 1;
        if (n >= TOUR_STEPS.length) set({ active: false, hasSeenTour: true });
        else set({ step: n });
      },
      prev: () => set({ step: Math.max(0, get().step - 1) }),
      goTo: (i) => set({ step: Math.max(0, Math.min(TOUR_STEPS.length - 1, i)) }),
      stop: () => set({ active: false, hasSeenTour: true }),
    }),
    {
      name: "systemdesign-tour",
      // Only the "seen" flag needs to survive reloads — not live step state.
      partialize: (s) => ({ hasSeenTour: s.hasSeenTour }),
    }
  )
);
