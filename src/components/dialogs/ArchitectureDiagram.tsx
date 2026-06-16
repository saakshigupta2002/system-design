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
const H_GAP = 48;
const V_GAP = 18;
const PAD = 18;

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
 * Renders a problem's reference solution as an architecture diagram with a
 * plain-language legend. Nodes are laid out in dependency layers (each column
 * is one hop deeper from the entry point) computed from the edges, so the
 * diagram stays readable regardless of how the canvas positions were authored
 * — large designs previously overlapped when their positions were scaled down.
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

  // Unique components in author order, remembering the authored y for stable
  // row ordering within a column.
  const ids: string[] = [];
  const refY = new Map<string, number>();
  for (const n of ref.nodes) {
    if (!refY.has(n.componentId)) {
      refY.set(n.componentId, n.y);
      ids.push(n.componentId);
    }
  }

  // Build the dependency graph (deduped; edges reference componentIds).
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of ids) {
    adj.set(id, []);
    indeg.set(id, 0);
  }
  const pairSeen = new Set<string>();
  for (const e of ref.edges) {
    if (!adj.has(e.source) || !adj.has(e.target)) continue;
    const key = `${e.source}→${e.target}`;
    if (pairSeen.has(key)) continue;
    pairSeen.add(key);
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  // Longest-path layering (Kahn's): column = hops from the entry point.
  const depth = new Map<string, number>();
  const remaining = new Map(indeg);
  const queue = ids.filter((id) => remaining.get(id) === 0);
  for (const id of queue) depth.set(id, 0);
  while (queue.length > 0) {
    const id = queue.shift()!;
    const d = depth.get(id) ?? 0;
    for (const child of adj.get(id) ?? []) {
      if ((depth.get(child) ?? -1) < d + 1) depth.set(child, d + 1);
      const r = (remaining.get(child) ?? 1) - 1;
      remaining.set(child, r);
      if (r === 0) queue.push(child);
    }
  }
  for (const id of ids) if (!depth.has(id)) depth.set(id, 0);

  // Group into columns; order rows by the authored vertical position.
  const cols = new Map<number, string[]>();
  for (const id of ids) {
    const d = depth.get(id)!;
    if (!cols.has(d)) cols.set(d, []);
    cols.get(d)!.push(id);
  }
  for (const colIds of cols.values()) {
    colIds.sort((a, b) => (refY.get(a) ?? 0) - (refY.get(b) ?? 0));
  }

  const numCols = Math.max(...cols.keys()) + 1;
  const maxRows = Math.max(...[...cols.values()].map((c) => c.length));
  const viewW = PAD * 2 + numCols * NODE_W + (numCols - 1) * H_GAP;
  const viewH = PAD * 2 + maxRows * NODE_H + (maxRows - 1) * V_GAP;

  const placedById = new Map<string, Placed>();
  for (const [d, colIds] of cols) {
    const colH = colIds.length * NODE_H + (colIds.length - 1) * V_GAP;
    colIds.forEach((id, i) => {
      const comp = getComponentById(id);
      placedById.set(id, {
        cx: PAD + d * (NODE_W + H_GAP) + NODE_W / 2,
        cy: PAD + (viewH - PAD * 2 - colH) / 2 + i * (NODE_H + V_GAP) + NODE_H / 2,
        label: comp?.label ?? id,
        color: CATEGORY_STROKE[comp?.category ?? ""] ?? "#71717a",
      });
    });
  }

  const legend = ids.map((id) => {
    const comp = getComponentById(id);
    return {
      label: comp?.label ?? id,
      color: CATEGORY_STROKE[comp?.category ?? ""] ?? "#71717a",
      why: notes?.[id] ?? shortDescription(comp?.description),
    };
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

  const drawnEdges: { from: Placed; to: Placed }[] = [];
  for (const key of pairSeen) {
    const [source, target] = key.split("→");
    const from = placedById.get(source);
    const to = placedById.get(target);
    if (from && to) drawnEdges.push({ from, to });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40">
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="h-auto w-full"
          role="img"
          aria-label="Reference architecture diagram"
        >
          <defs>
            <marker
              id="arch-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-zinc-600)" />
            </marker>
          </defs>

          {/* Edges (drawn first, behind nodes) */}
          {drawnEdges.map(({ from, to }, i) => {
            const tip = borderPoint(from, to);
            return (
              <line
                key={i}
                x1={from.cx}
                y1={from.cy}
                x2={tip.x}
                y2={tip.y}
                stroke="var(--color-zinc-600)"
                strokeWidth={1.3}
                markerEnd="url(#arch-arrow)"
              />
            );
          })}

          {/* Nodes */}
          {[...placedById.values()].map((p, i) => (
            <g key={i}>
              <rect
                x={p.cx - NODE_W / 2}
                y={p.cy - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={7}
                fill="var(--color-zinc-800)"
                stroke={p.color}
                strokeOpacity={0.5}
                strokeWidth={1.2}
              />
              <text
                x={p.cx}
                y={p.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontFamily="system-ui, sans-serif"
                fill="var(--color-zinc-100)"
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
