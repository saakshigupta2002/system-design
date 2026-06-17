"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";
import { useCanvasStore, type CustomEdgeData } from "@/store/canvasStore";

function formatQps(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

const protocolBadge: Record<string, { text: string; color: string } | null> = {
  http: null,
  grpc: { text: "gRPC", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  websocket: { text: "WS", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  pubsub: { text: "pub/sub", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  tcp: { text: "TCP", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  custom: null,
};

function AnimatedEdgeInner({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const isRunning = useSimulationStore((s) => s.isRunning);
  const result = useSimulationStore((s) => s.result);
  const deleteEdge = useCanvasStore((s) => s.deleteEdge);
  // Traffic carried by this wire in the latest simulation (if any).
  const flow =
    result?.edgeFlows instanceof Map ? result.edgeFlows.get(`${source}→${target}`) : undefined;
  // A wire only "flows" if it's actually carrying traffic. Once a result
  // exists, edges with zero flow (e.g. leaving an offline node) go dead
  // instead of misleadingly animating. Before/while computing, animate all.
  const flowing = result !== null ? (flow ?? 0) > 0 : isRunning;
  const edgeData = (data ?? {}) as CustomEdgeData;
  const isAsync = edgeData.async === true;
  const protocol = edgeData.protocol;
  const label = edgeData.label;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const badge = protocol ? protocolBadge[protocol] : null;
  const showLabel = label || badge;

  return (
    <g>
      {/* Main edge — highlighted while selected so it's clear what Delete acts on */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "rgb(34, 211, 238)" : flowing ? "rgba(52, 211, 230, 0.6)" : "var(--edge-idle)",
          strokeWidth: selected ? 2.25 : flowing ? 1.9 : 1.5,
          ...(isAsync ? { strokeDasharray: "6 4" } : {}),
        }}
      />
      {/* Directional traffic — particles flow source → target along the path,
          and persist after the run so the active design stays animated. */}
      {flowing && (
        <>
          <circle r="2.4" fill="#3ad6e6" opacity="0.95">
            <animateMotion dur="1.6s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="2" fill="#3ad6e6" opacity="0.6">
            <animateMotion dur="1.6s" repeatCount="indefinite" path={edgePath} begin="0.53s" />
          </circle>
          <circle r="1.6" fill="#3ad6e6" opacity="0.35">
            <animateMotion dur="1.6s" repeatCount="indefinite" path={edgePath} begin="1.06s" />
          </circle>
        </>
      )}
      {/* Delete button — shown on the selected wire */}
      {selected && (
        <EdgeLabelRenderer>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteEdge(id);
            }}
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY - 18}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 shadow-sm transition-colors hover:border-rose-500/50 hover:bg-rose-500/15 hover:text-rose-400"
            title="Delete connection (or press Delete)"
            aria-label="Delete connection"
          >
            <X className="h-3 w-3" />
          </button>
        </EdgeLabelRenderer>
      )}
      {/* Traffic flow from the latest simulation */}
      {flow !== undefined && (
        <EdgeLabelRenderer>
          <span
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY + (showLabel ? 16 : 0)}px)`,
              pointerEvents: "none",
            }}
            className="rounded border border-cyan-500/30 bg-zinc-950/90 px-1.5 py-0.5 font-mono text-[10px] leading-none text-cyan-400"
            title="Requests/sec on this connection in the last simulation"
          >
            {formatQps(flow)}/s
          </span>
        </EdgeLabelRenderer>
      )}
      {/* Label + protocol badge */}
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan flex items-center gap-1"
          >
            {label && (
              <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400 leading-none">
                {label}
              </span>
            )}
            {badge && (
              <span
                className={`rounded border px-1 py-0.5 text-[9px] font-medium leading-none ${badge.color}`}
              >
                {badge.text}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

export const AnimatedEdge = memo(AnimatedEdgeInner);
