import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Compact per-category result, kept on each attempt so the recommender can
 *  spot recurring weak areas. */
export interface ScoreEntryCategory {
  c: string; // category name
  s: number; // score
  m: number; // maxScore
}

export interface ScoreEntry {
  problemId: string;
  total: number;
  verdict: string;
  timestamp: number;
  categories?: ScoreEntryCategory[];
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
