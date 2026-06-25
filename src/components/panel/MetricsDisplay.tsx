"use client";

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSimulationStore } from "@/store/simulationStore";
import { useCanvasStore } from "@/store/canvasStore";
import { Activity } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  idle: "bg-zinc-600",
  down: "bg-rose-600",
};

function formatGB(gb: number): string {
  if (gb >= 1_000_000) return `${(gb / 1_000_000).toFixed(1)} PB`;
  if (gb >= 1_000) return `${(gb / 1_000).toFixed(1)} TB`;
  return `${Math.round(gb)} GB`;
}

export function MetricsDisplay() {
  const result = useSimulationStore((s) => s.result);
  const nodes = useCanvasStore((s) => s.nodes);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);
  const { setCenter } = useReactFlow();

  // Clicking a metric row highlights and centers that node on the canvas.
  const focusNode = useCallback(
    (nodeId: string) => {
      const node = useCanvasStore.getState().nodes.find((n) => n.id === nodeId);
      if (!node) return;
      setSelectedNode(nodeId);
      setCenter(node.position.x + 60, node.position.y + 40, { zoom: 1.1, duration: 500 });
    },
    [setSelectedNode, setCenter]
  );

  if (!result || !(result.nodeMetrics instanceof Map)) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
          <Activity className="h-4 w-4 text-zinc-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-300">No simulation data</p>
          <p className="mt-1 max-w-[200px] text-xs text-zinc-500">
            Configure load above and click <span className="text-cyan-500">Run Simulation</span> to see metrics
          </p>
        </div>
      </div>
    );
  }

  const sortedMetrics = [...result.nodeMetrics.values()].sort(
    (a, b) => b.utilization - a.utilization
  );

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-zinc-800 px-2.5 py-2">
          <p className="text-xs text-zinc-500">Throughput</p>
          <p className="font-mono text-sm font-semibold text-zinc-100">
            {new Intl.NumberFormat("en-US").format(result.throughput)}
          </p>
          <p className="text-xs text-zinc-500">req/s</p>
        </div>
        <div className="rounded-md bg-zinc-800 px-2.5 py-2">
          <p className="text-xs text-zinc-500">Latency (p50 / p99)</p>
          <p className="font-mono text-sm font-semibold text-zinc-100">
            {result.p50LatencyMs.toFixed(0)}
            <span className="text-zinc-500"> / </span>
            <span className="text-amber-300">{result.p99LatencyMs.toFixed(0)}</span>
          </p>
          <p className="text-xs text-zinc-500">ms (critical path)</p>
        </div>
      </div>

      {/* Storage capacity vs. the problem's required volume */}
      {result.storageRequiredGB != null && (
        <div className={`rounded-md border px-2.5 py-2 ${result.storageOk ? "border-zinc-800 bg-zinc-900/60" : "border-rose-500/20 bg-rose-950/30"}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">Storage capacity</p>
            <p className={`font-mono text-xs ${result.storageOk ? "text-zinc-300" : "text-rose-400"}`}>
              {formatGB(result.storageCapacityGB ?? 0)} / {formatGB(result.storageRequiredGB)} needed
            </p>
          </div>
        </div>
      )}

      {/* Surface the cache model so reduced storage QPS isn't a mystery */}
      {(() => {
        const caches = nodes.filter(
          (n) => (n.data as Record<string, unknown>).componentId === "cache"
        );
        if (caches.length === 0) return null;
        const rates = caches.map((c) =>
          Math.round((((c.data as Record<string, unknown>).cacheHitRate as number) ?? 0.8) * 100)
        );
        const rateText =
          new Set(rates).size === 1 ? `${rates[0]}%` : rates.map((r) => `${r}%`).join(" / ");
        return (
          <p className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 text-xs leading-relaxed text-zinc-400">
            Cache model: {rateText} of lookups are served from memory — only misses reach
            storage behind a cache. Adjustable on each cache node.
          </p>
        );
      })()}

      {result.warnings.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-amber-500/20 bg-amber-950/30 px-2.5 py-2">
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs leading-relaxed text-amber-400">
              {w}
            </p>
          ))}
        </div>
      )}

      {result.bottleneckNodes.length > 0 && (
        <div className="rounded-md border border-rose-500/20 bg-rose-950/30 px-2.5 py-2">
          <p className="text-xs font-medium text-rose-400">
            {result.bottleneckNodes.length} Bottleneck{result.bottleneckNodes.length > 1 ? "s" : ""} Detected
          </p>
        </div>
      )}

      {/* Per-node metrics */}
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Per-Node Metrics
      </p>

      <ScrollArea className="max-h-[300px]">
        <div className="space-y-1.5">
          {sortedMetrics.map((m) => {
            const node = nodes.find((n) => n.id === m.nodeId);
            const label = (node?.data as Record<string, unknown>)?.label as string ?? m.nodeId;
            return (
              <div
                key={m.nodeId}
                role="button"
                tabIndex={0}
                onClick={() => focusNode(m.nodeId)}
                onKeyDown={(e) => { if (e.key === "Enter") focusNode(m.nodeId); }}
                title="Click to locate this component on the canvas"
                className="cursor-pointer rounded-md bg-zinc-800 px-2.5 py-2 transition-colors hover:bg-zinc-700/80"
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[m.status]}`} />
                  <span className="text-xs font-medium text-zinc-300">
                    {label}
                  </span>
                  {m.isBottleneck && (
                    <span className="ml-auto text-xs font-medium text-rose-400" style={{ animation: 'status-pulse 2s infinite' }}>
                      BOTTLENECK
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[11px] text-zinc-400">QPS</p>
                    <p className="font-mono text-xs text-zinc-300">
                      {m.incomingQPS.toFixed(0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400">Util</p>
                    <div className="flex items-center gap-1">
                      <div className="h-1 w-8 overflow-hidden rounded-full bg-zinc-700">
                        <div
                          className={`h-full rounded-full ${
                            m.utilization > 0.8 ? "bg-rose-500" :
                            m.utilization > 0.5 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(m.utilization * 100, 100)}%` }}
                        />
                      </div>
                      <p className={`font-mono text-xs ${
                        m.utilization > 0.8 ? "text-rose-400" :
                        m.utilization > 0.5 ? "text-amber-400" : "text-emerald-400"
                      }`}>
                        {(m.utilization * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400">Latency</p>
                    <p className="font-mono text-xs text-zinc-300">
                      {m.latencyMs.toFixed(0)}ms
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
