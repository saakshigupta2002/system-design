"use client";

import { useCallback, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Play, Loader2, Activity, Square, RotateCcw } from "lucide-react";
import type { Node } from "@xyflow/react";
import { useSimulationStore } from "@/store/simulationStore";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import { runSimulation } from "@/engine/simulator";
import { getProblemById } from "@/data/problems";

const PRESETS = [
  { label: "Light", value: 1000 },
  { label: "Medium", value: 10000 },
  { label: "Heavy", value: 100000 },
  { label: "Stress", value: 500000 },
];

const RAMP_FPS = 20;
const RAMP_DURATION = 6500;

interface SimulationControlsProps {
  onSimulate: () => void;
}

export function SimulationControls({ onSimulate }: SimulationControlsProps) {
  const config = useSimulationStore((s) => s.config);
  const setConfig = useSimulationStore((s) => s.setConfig);
  const isRunning = useSimulationStore((s) => s.isRunning);
  const isRamping = useSimulationStore((s) => s.isRamping);
  const liveRps = useSimulationStore((s) => s.liveRps);
  const result = useSimulationStore((s) => s.result);
  const failedCount = useSimulationStore((s) => s.failedNodeIds.length);
  const clearFailed = useSimulationStore((s) => s.clearFailed);
  const selectedProblemId = useAppStore((s) => s.selectedProblemId);

  // Required load for the selected problem = reads/sec + writes/sec. Lets the
  // simulator be driven by the problem's real traffic, not just a generic
  // slider. Clamped to the slider's max.
  const problem = getProblemById(selectedProblemId);
  const problemLoad = problem
    ? Math.min(
        500000,
        problem.requirements.readsPerSec + problem.requirements.writesPerSec
      )
    : null;

  const rampRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop the running simulation: clear the result (stops the flowing edges)
  // and reset every node back to idle.
  const stopSimulation = useCallback(() => {
    const { nodes } = useCanvasStore.getState();
    const updates = new Map<string, Record<string, unknown>>();
    for (const n of nodes) {
      if (n.type !== "text") {
        updates.set(n.id, { utilization: 0, status: "idle", isBottleneck: false });
      }
    }
    useCanvasStore.getState().updateAllNodeData(updates);
    useSimulationStore.getState().setResult(null);
    useSimulationStore.getState().setRunning(false);
  }, []);

  const stopRamp = useCallback(() => {
    if (rampRef.current) {
      clearInterval(rampRef.current);
      rampRef.current = null;
    }
    useSimulationStore.getState().setRamping(false);
    useSimulationStore.getState().setLiveRps(null);
  }, []);

  // Stop any running animation if the panel unmounts (tab switch, etc.).
  useEffect(() => stopRamp, [stopRamp]);

  const runRamp = useCallback(() => {
    const { nodes, edges } = useCanvasStore.getState();
    const componentNodes = nodes.filter((n) => n.type !== "text") as Node<ComponentNodeData>[];
    if (componentNodes.length === 0) {
      useAppStore.getState().showToast("No components to simulate", "info");
      return;
    }
    if (useSimulationStore.getState().isRamping) return;

    const peak = useSimulationStore.getState().config.requestsPerSec;
    useSimulationStore.getState().setRamping(true);
    const totalFrames = Math.round(RAMP_DURATION / (1000 / RAMP_FPS));
    let frame = 0;

    rampRef.current = setInterval(() => {
      frame++;
      const t = frame / totalFrames;
      // Viral-spike curve: ramp up, overshoot past the target to expose the
      // breaking point, then decay and recover.
      let mult: number;
      if (t < 0.35) mult = t / 0.35;
      else if (t < 0.55) mult = 1 + ((t - 0.35) / 0.2) * 0.3;
      else mult = 1.3 - ((t - 0.55) / 0.45) * 1.0;
      const rps = Math.max(100, Math.min(500000, Math.round(peak * mult)));

      const failed = new Set(useSimulationStore.getState().failedNodeIds);
      const res = runSimulation(componentNodes, edges, rps, failed);
      const updates = new Map<string, Record<string, unknown>>();
      for (const [nid, m] of res.nodeMetrics) {
        updates.set(nid, { utilization: m.utilization, status: m.status, isBottleneck: m.isBottleneck });
      }
      useCanvasStore.getState().updateAllNodeData(updates);
      useSimulationStore.getState().setResult(res);
      useSimulationStore.getState().setLiveRps(rps);

      if (frame >= totalFrames) {
        stopRamp();
        useAppStore.getState().showToast("Ramp complete", "success");
      }
    }, 1000 / RAMP_FPS);
  }, [stopRamp]);

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Simulation Config
      </p>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => setConfig({ requestsPerSec: preset.value })}
            disabled={isRamping}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              config.requestsPerSec === preset.value
                ? "bg-cyan-500/15 text-cyan-500"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
            }`}
          >
            {preset.label}
          </button>
        ))}
        {problemLoad != null && (
          <button
            onClick={() => setConfig({ requestsPerSec: problemLoad })}
            disabled={isRamping}
            title={`Set load to this problem's reads + writes per second (${new Intl.NumberFormat("en-US").format(problemLoad)} req/s) — the same load the score uses`}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              config.requestsPerSec === problemLoad
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-zinc-800 text-emerald-400/80 hover:bg-zinc-700 hover:text-emerald-300"
            }`}
          >
            Match problem
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs text-zinc-400">{isRamping ? "Peak load" : "Requests/sec"}</label>
            <span className="font-mono text-xs text-cyan-500">
              {new Intl.NumberFormat("en-US").format(config.requestsPerSec)}
            </span>
          </div>
          <Slider
            value={[config.requestsPerSec]}
            onValueChange={(v) => setConfig({ requestsPerSec: Array.isArray(v) ? v[0] : v })}
            min={100}
            max={500000}
            step={100}
            className=""
          />
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* Live ramp readout */}
      {isRamping && liveRps != null && (
        <div className="rounded-md border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Live load</p>
          <p className="font-mono text-lg font-semibold tabular-nums text-cyan-400">
            {new Intl.NumberFormat("en-US").format(liveRps)}
            <span className="ml-1 text-xs font-normal text-zinc-500">req/s</span>
          </p>
        </div>
      )}

      {isRamping ? (
        <Button
          onClick={stopRamp}
          variant="outline"
          className="w-full gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          size="sm"
        >
          <Square className="h-3 w-3" />
          Stop
        </Button>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={onSimulate}
            disabled={isRunning}
            className="w-full gap-2 bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Simulating...
              </>
            ) : result !== null ? (
              <>
                <Play className="h-3 w-3" />
                Re-run Simulation
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Run Simulation
              </>
            )}
          </Button>
          {result !== null && !isRunning && (
            <Button
              onClick={stopSimulation}
              variant="outline"
              className="w-full gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
              size="sm"
              title="Clear the simulation and reset the canvas to idle"
            >
              <Square className="h-3 w-3" />
              Stop simulation
            </Button>
          )}
          <Button
            onClick={runRamp}
            disabled={isRunning}
            variant="outline"
            className="w-full gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
            size="sm"
            title="Animate a traffic spike up to your peak load and watch utilization climb and recover"
          >
            <Activity className="h-3 w-3" />
            Run traffic ramp
          </Button>
        </div>
      )}

      {/* Chaos indicator */}
      {failedCount > 0 && (
        <button
          onClick={clearFailed}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/15"
        >
          <RotateCcw className="h-3 w-3" />
          {failedCount} component{failedCount > 1 ? "s" : ""} offline — reset
        </button>
      )}

      <p className="text-[11px] leading-relaxed text-zinc-500">
        Tip: take a component offline with its power button on the canvas, then simulate to watch
        the cascade. Use the traffic ramp to see the system climb and recover under a spike.
      </p>
    </div>
  );
}
