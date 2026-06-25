import { create } from "zustand";
import { persist } from "zustand/middleware";
import { schedule, isDue, isLearned, type ReviewGrade, type SrsRecord } from "@/lib/srs";

/** Spaced-repetition progress per drill. Each review reschedules the card via
 *  SM-2, so the library can surface what's due today and space reviews out. */
interface DrillProgressState {
  records: Record<string, SrsRecord>;
  review: (id: string, grade: ReviewGrade) => void;
  reset: (id: string) => void;
  isLearned: (id: string) => boolean;
  isDue: (id: string) => boolean;
}

export const useDrillProgressStore = create<DrillProgressState>()(
  persist(
    (set, get) => ({
      records: {},
      review: (id, grade) =>
        set((s) => ({ records: { ...s.records, [id]: schedule(s.records[id], grade) } })),
      reset: (id) =>
        set((s) => {
          const next = { ...s.records };
          delete next[id];
          return { records: next };
        }),
      isLearned: (id) => isLearned(get().records[id]),
      isDue: (id) => isDue(get().records[id]),
    }),
    { name: "systemdesign-drills" }
  )
);
