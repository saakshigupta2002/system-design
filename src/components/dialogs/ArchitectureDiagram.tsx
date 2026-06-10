"use client";

import { getProblemById } from "@/data/problems";
import { getComponentById } from "@/data/components";

/** Category accent colors for node borders (match the canvas palette). */
const CATEGORY_STROKE: Record<string, string> = {
  networking: "#60a5fa",
  compute: "#a78bfa",
  storage: "#fbbf24",
  messaging: "#34d399",
  infrastructure: "#22d3ee",
};

const NODE_W = 104;
const NODE_H = 40;
const PAD = 20;
const VIEW_W = 660;

interface Placed {
  cx: number;
  cy: number;
  label: string;
  color: string;
}

/** First sentence of a component's description, as a fallback legend note. */
function shortDescription(text: string | undefined): string {
  if (!text) return "";
  const first = text.split(". ")[0];
  return first.length > 110 ? first.slice(0, 107) + "…" : first;
}

/**
 * Renders a problem's reference solution as a small architecture diagram,
 * derived from the same node positions + edges used on the canvas, plus a
 * plain-language legend explaining what each component is and why it's there.
 */
export function ArchitectureDiagram({
  problemId,
  notes,
}: {
  problemId: string;
  notes?: Record<string, string>;
}) {
  const ref = getProblemById(problemId)?.referenceSolution;
  if (!ref || ref.nodes.length === 0) return null;

  // Unique components in the order they appear, for the legend.
  const seen = new Set<string>();
  const legend = ref.nodes
    .filter((n) => {
      if (seen.has(n.componentId)) return false;
      seen.add(n.componentId);
      return true;
    })
    .map((n) => {
      const comp = getComponentById(n.componentId);
      return {
        label: comp?.label ?? n.componentId,
        color: CATEGORY_STROKE[comp?.category ?? ""] ?? "#71717a",
        why: notes?.[n.componentId] ?? shortDescription(comp?.description),
      };
    });

  const xs = ref.nodes.map((n) => n.x);
  const ys = ref.nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const contentW = VIEW_W - PAD * 2 - NODE_W;
  // Uniform scale so the layout keeps its shape; cap vertical growth.
  const scale = Math.min(contentW / spanX, 300 / spanY);
  const viewH = spanY * scale + NODE_H + PAD * 2;

  // componentId -> first placed node (edges reference endpoints by componentId)
  const byComponent = new Map<string, Placed>();
  const placed: Placed[] = ref.nodes.map((n) => {
    const comp = getComponentById(n.componentId);
    const p: Placed = {
      cx: PAD + (n.x - minX) * scale + NODE_W / 2,
      cy: PAD + (n.y - minY) * scale + NODE_H / 2,
      label: comp?.label ?? n.componentId,
      color: CATEGORY_STROKE[comp?.category ?? ""] ?? "#71717a",
    };
    if (!byComponent.has(n.componentId)) byComponent.set(n.componentId, p);
    return p;
  });

  // Trim an edge so the arrow tip lands on the target box border, not its center.
  function borderPoint(from: Placed, to: Placed) {
    const dx = from.cx - to.cx;
    const dy = from.cy - to.cy;
    const hw = NODE_W / 2 + 2;
    const hh = NODE_H / 2 + 2;
    const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
    const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy);
    return { x: to.cx + dx * s, y: to.cy + dy * s };
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
      <svg viewBox={`0 0 ${VIEW_W} ${viewH}`} className="h-auto w-full" role="img" aria-label="Reference architecture diagram">
        <defs>
          <marker id="arch-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#52525b" />
          </marker>
        </defs>

        {/* Edges (drawn first, behind nodes) */}
        {ref.edges.map((e, i) => {
          const from = byComponent.get(e.source);
          const to = byComponent.get(e.target);
          if (!from || !to) return null;
          const tip = borderPoint(from, to);
          return (
            <line
              key={i}
              x1={from.cx}
              y1={from.cy}
              x2={tip.x}
              y2={tip.y}
              stroke="#52525b"
              strokeWidth={1.3}
              markerEnd="url(#arch-arrow)"
            />
          );
        })}

        {/* Nodes */}
        {placed.map((p, i) => (
          <g key={i}>
            <rect
              x={p.cx - NODE_W / 2}
              y={p.cy - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              rx={7}
              fill="#18181b"
              stroke={p.color}
              strokeOpacity={0.5}
              strokeWidth={1.2}
            />
            <text
              x={p.cx}
              y={p.cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fontFamily="system-ui, sans-serif"
              fill="#e4e4e7"
            >
              {p.label.length > 16 ? p.label.slice(0, 15) + "…" : p.label}
            </text>
          </g>
        ))}
      </svg>
      </div>

      {/* Legend — what each component is and why it's here */}
      {legend.length > 0 && (
        <ul className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          {legend.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span>
                <span className="font-medium text-zinc-200">{item.label}</span>
                {item.why && <span className="text-zinc-400"> — {item.why}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
