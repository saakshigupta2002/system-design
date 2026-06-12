import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScoreEntry {
  problemId: string;
  total: number;
  verdict: string;
  timestamp: number;
}

interface ScoreHistoryState {
  entries: ScoreEntry[];
  addEntry: (entry: Omit<ScoreEntry, "timestamp">) => void;
}

const HISTORY_LIMIT = 100;

/** Past scoring attempts, so users can see their improvement per problem. */
export const useScoreHistoryStore = create<ScoreHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((s) => ({
          entries: [...s.entries.slice(-(HISTORY_LIMIT - 1)), { ...entry, timestamp: Date.now() }],
        })),
    }),
    { name: "systemdesign-score-history" }
  )
);
