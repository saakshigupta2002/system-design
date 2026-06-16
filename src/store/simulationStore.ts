import { create } from "zustand";
import type { SimulationResult, SimulationConfig } from "@/types/simulation";
import type { ScoreResult } from "@/types/scoring";

interface SimulationState {
  isRunning: boolean;
  config: SimulationConfig;
  result: SimulationResult | null;
  scoreResult: ScoreResult | null;
  showScore: boolean;
  /** Chaos mode: component node ids the user has taken offline. */
  failedNodeIds: string[];
  /** Time-series ramp: true while animating, and the current live load. */
  isRamping: boolean;
  liveRps: number | null;

  setRunning: (running: boolean) => void;
  setConfig: (config: Partial<SimulationConfig>) => void;
  setResult: (result: SimulationResult | null) => void;
  setScoreResult: (result: ScoreResult | null) => void;
  setShowScore: (show: boolean) => void;
  toggleFailed: (nodeId: string) => void;
  clearFailed: () => void;
  setRamping: (ramping: boolean) => void;
  setLiveRps: (rps: number | null) => void;
  reset: () => void;
}

const defaultConfig: SimulationConfig = {
  requestsPerSec: 10000,
};

export const useSimulationStore = create<SimulationState>((set) => ({
  isRunning: false,
  config: defaultConfig,
  result: null,
  scoreResult: null,
  showScore: false,
  failedNodeIds: [],
  isRamping: false,
  liveRps: null,

  setRunning: (running) => set({ isRunning: running }),
  setConfig: (config) =>
    set((s) => ({ config: { ...s.config, ...config } })),
  setResult: (result) => set({ result }),
  setScoreResult: (result) => set({ scoreResult: result }),
  setShowScore: (show) => set({ showScore: show }),
  toggleFailed: (nodeId) =>
    set((s) => ({
      failedNodeIds: s.failedNodeIds.includes(nodeId)
        ? s.failedNodeIds.filter((id) => id !== nodeId)
        : [...s.failedNodeIds, nodeId],
    })),
  clearFailed: () => set({ failedNodeIds: [] }),
  setRamping: (ramping) => set({ isRamping: ramping }),
  setLiveRps: (rps) => set({ liveRps: rps }),
  reset: () =>
    set({
      isRunning: false,
      config: defaultConfig,
      result: null,
      scoreResult: null,
      showScore: false,
      failedNodeIds: [],
      isRamping: false,
      liveRps: null,
    }),
}));
