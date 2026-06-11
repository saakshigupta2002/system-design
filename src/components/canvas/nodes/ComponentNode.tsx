"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import { motion } from "framer-motion";
import type { ComponentNodeData } from "@/store/canvasStore";
import { useCanvasStore } from "@/store/canvasStore";
import { Server } from "lucide-react";
import { ICON_MAP } from "@/lib/icons";

type ComponentNode = Node<ComponentNodeData, "component">;

const CATEGORY_COLORS: Record<string, { border: string; icon: string }> = {
  networking: { border: "border-zinc-700", icon: "text-blue-400" },
  compute: { border: "border-zinc-700", icon: "text-violet-400" },
  storage: { border: "border-zinc-700", icon: "text-amber-400" },
  messaging: { border: "border-zinc-700", icon: "text-emerald-400" },
  infrastructure: { border: "border-zinc-700", icon: "text-cyan-400" },
};

const STATUS_DOT: Record<string, string> = {
  healthy: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-rose-500",
  idle: "bg-zinc-600",
};

const HANDLE_CLASS =
  "!h-3.5 !w-3.5 !rounded-full !border-2 !border-zinc-500 !bg-zinc-300 transition-all hover:!scale-150 hover:!border-cyan-400 hover:!bg-cyan-400";

// One handle per side. The canvas runs in loose connection mode, so each
// handle can both start and receive a wire — no stacked source/target pairs
// blocking each other's hit area. Edges without handle ids (older saves,
// reference solutions) are normalized to right→left by the canvas.
const HANDLE_SIDES: { id: string; pos: Position }[] = [
  { id: "top", pos: Position.Top },
  { id: "right", pos: Position.Right },
  { id: "bottom", pos: Position.Bottom },
  { id: "left", pos: Position.Left },
];

function ComponentNodeInner({ id, data, selected }: NodeProps<ComponentNode>) {
  const nodeData = data;
  const Icon = ICON_MAP[nodeData.icon] ?? Server;
  const colors = CATEGORY_COLORS[nodeData.category] ?? CATEGORY_COLORS.compute;
  const status = (nodeData.status as string) ?? "idle";
  const statusDot = STATUS_DOT[status] ?? STATUS_DOT.idle;
  const isBottleneck = nodeData.isBottleneck ?? false;
  const replicas = nodeData.replicas ?? 1;
  const utilization = nodeData.utilization ?? 0;

  const isCustom = nodeData.componentId === "custom";
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(nodeData.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitLabel = useCallback(() => {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== nodeData.label) {
      updateNodeData(id, { label: trimmed });
    } else {
      setEditLabel(nodeData.label);
    }
    setEditing(false);
  }, [editLabel, nodeData.label, id, updateNodeData]);

  const handleDoubleClick = useCallback(() => {
    if (!isCustom) return;
    setEditLabel(nodeData.label);
    setEditing(true);
  }, [isCustom, nodeData.label]);

  return (
    <div
      className={`
        relative flex flex-col items-center gap-1 rounded-lg border bg-zinc-900 px-4 py-3
        shadow-sm transition-colors
        ${isBottleneck ? "border-rose-500/60" : colors.border}
        ${selected ? "border-cyan-500" : ""}
      `}
    >
      {/* Status indicator dot */}
      <div
        className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${statusDot}`}
        style={{ animation: status !== 'idle' ? 'status-pulse 2s infinite' : 'none' }}
      />

      {/* Icon + Label row */}
      <div className="flex items-center gap-1.5">
        <div className={`flex h-6 w-6 items-center justify-center rounded ${colors.icon}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {editing ? (
          <input
            ref={inputRef}
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLabel();
              if (e.key === "Escape") {
                setEditLabel(nodeData.label);
                setEditing(false);
              }
            }}
            className="max-w-[80px] bg-transparent text-[11px] font-medium text-zinc-200 outline-none border-b border-cyan-500"
          />
        ) : (
          <span
            className={`max-w-[96px] whitespace-normal break-words text-center text-[11px] font-medium leading-tight text-zinc-200 ${isCustom ? "cursor-text" : ""}`}
            onDoubleClick={handleDoubleClick}
          >
            {nodeData.label}
          </span>
        )}
      </div>

      {/* Stats */}
      <span className="font-mono text-[9px] text-zinc-500">
        {nodeData.maxQPS === Infinity ? '\u221e' : ((nodeData.maxQPS ?? 0)/1000).toFixed(0) + 'k'} qps
      </span>

      {/* Replicas badge */}
      {replicas > 1 && (
        <span className="absolute -left-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1 text-[8px] font-bold text-white">
          ×{replicas}
        </span>
      )}

      {/* Utilization bar (shown during simulation) */}
      {utilization > 0 && (
        <div className="mt-0.5 flex w-full items-center gap-1">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              className={`h-full rounded-full ${
                utilization > 0.8 ? "bg-rose-500" : utilization > 0.5 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(utilization * 100, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className={`font-mono text-[8px] ${
            utilization > 0.8 ? "text-rose-400" : utilization > 0.5 ? "text-amber-400" : "text-emerald-400"
          }`}>{(utilization * 100).toFixed(0)}%</span>
        </div>
      )}

      {/* Handles — one per side; drag direction decides the flow
          (start = sender, release = receiver). */}
      {HANDLE_SIDES.map(({ id: handleId, pos }) => (
        <Handle key={handleId} id={handleId} type="source" position={pos} className={HANDLE_CLASS} />
      ))}
    </div>
  );
}

function areComponentNodePropsEqual(
  prev: NodeProps<ComponentNode>,
  next: NodeProps<ComponentNode>
): boolean {
  if (prev.selected !== next.selected) return false;
  const p = prev.data;
  const n = next.data;
  return (
    p.componentId === n.componentId &&
    p.label === n.label &&
    p.status === n.status &&
    p.replicas === n.replicas &&
    p.utilization === n.utilization &&
    p.maxQPS === n.maxQPS &&
    p.latencyMs === n.latencyMs &&
    p.category === n.category &&
    p.icon === n.icon &&
    p.isBottleneck === n.isBottleneck
  );
}

export const ComponentNode = memo(ComponentNodeInner, areComponentNodePropsEqual);
