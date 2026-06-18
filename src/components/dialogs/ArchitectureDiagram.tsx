"use client";

import { getProblemById } from "@/data/problems";
import { getComponentById } from "@/data/components";
import { ICON_MAP } from "@/lib/icons";
import { Server } from "lucide-react";

/** Category accent colors for node borders/icons (match the canvas palette). */
const CATEGORY_STROKE: Record<string, string> = {
  client: "#f472b6",
  networking: "#60a5fa",
  compute: "#a78bfa",
  storage: "#fbbf24",
  messaging: "#34d399",
  infrastructure: "#22d3ee",
  aws: "#fb923c",
};

const NODE_W = 128;
const H_GAP = 46;
const V_GAP = 18;
const PAD = 18;

export interface DiagramNode {
  componentId: string;
  x: number;
  y: number;
  /** Optional unique id so the same component can appear more than once
   *  (e.g. a primary + replica, or several shards). Defaults to componentId. */
  id?: string;
  /** Optional label override (e.g. "Primary", "Shard 1"). */
  label?: string;
}

export interface DiagramEdge {
  source: string; // references a node id (or componentId when no id given)
  target: string;
}

interface Placed {
  cx: number;
  cy: number;
  label: string;
  color: string;
  componentId: string;
  caption?: string;
}

/** First sentence of a component's description, as a fallback legend note. */
function shortDescription(text: string | undefined): string {
  if (!text) return "";
  const first = text.split(". ")[0];
  return first.length > 110 ? first.slice(0, 107) + "…" : first;
}

/**
 * Renders a problem's reference solution as an architecture diagram with a
 * plain-language legend.
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
  return <ComponentDiagram nodes={ref.nodes} edges={ref.edges} notes={notes} />;
}

/**
 * Renders an arbitrary set of components + wires as a layered architecture
 * diagram with icons, category colors, and optional per-node captions. Used by
 * the editorial (via a problem's reference) and by Concept Practice (with
 * standalone designs). Nodes may repeat a componentId by giving each an `id`.
 *
 * - `captions` (keyed by node id/componentId) renders a short role line under
 *   the box — great for making practice diagrams self-explanatory.
 * - `showLegend` (default true) toggles the descriptive legend below.
 */
export function ComponentDiagram({
  nodes,
  edges,
  notes,
  captions,
  showLegend = true,
}: {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  notes?: Record<string, string>;
  captions?: Record<string, string>;
  showLegend?: boolean;
}) {
  if (nodes.length === 0) return null;

  const hasCaptions = !!captions && nodes.some((n) => captions[n.id ?? n.componentId]);
  const NODE_H = hasCaptions ? 58 : 44;

  // Unique nodes by key (id ?? componentId), in author order, remembering the
  // authored y for stable row ordering within a column.
  const ids: string[] = [];
  const refY = new Map<string, number>();
  const keyToComp = new Map<string, string>();
  const keyToLabel = new Map<string, string>();
  for (const n of nodes) {
    const key = n.id ?? n.componentId;
    if (!refY.has(key)) {
      refY.set(key, n.y);
      keyToComp.set(key, n.componentId);
      if (n.label) keyToLabel.set(key, n.label);
      ids.push(key);
    }
  }

  // Build the dependency graph (deduped; edges reference node keys).
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of ids) {
    adj.set(id, []);
    indeg.set(id, 0);
  }
  const pairSeen = new Set<string>();
  for (const e of edges) {
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
      const componentId = keyToComp.get(id)!;
      const comp = getComponentById(componentId);
      placedById.set(id, {
        cx: PAD + d * (NODE_W + H_GAP) + NODE_W / 2,
        cy: PAD + (viewH - PAD * 2 - colH) / 2 + i * (NODE_H + V_GAP) + NODE_H / 2,
        label: keyToLabel.get(id) ?? comp?.label ?? componentId,
        color: CATEGORY_STROKE[comp?.category ?? ""] ?? "#71717a",
        componentId,
        caption: captions?.[id],
      });
    });
  }

  // Legend lists unique components once (by componentId).
  const legendIds: string[] = [];
  for (const id of ids) {
    const cid = keyToComp.get(id)!;
    if (!legendIds.includes(cid)) legendIds.push(cid);
  }
  const legend = legendIds.map((cid) => {
    const comp = getComponentById(cid);
    return {
      label: comp?.label ?? cid,
      color: CATEGORY_STROKE[comp?.category ?? ""] ?? "#71717a",
      why: notes?.[cid] ?? shortDescription(comp?.description),
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
          aria-label="Architecture diagram"
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
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-zinc-500)" />
            </marker>
          </defs>

          {/* Edges (drawn first, behind nodes). Trim BOTH ends to the box
              borders so a line runs edge-to-edge, not from box center. */}
          {drawnEdges.map(({ from, to }, i) => {
            const start = borderPoint(to, from); // point on the source box border
            const end = borderPoint(from, to); // point on the target box border
            return (
              <line
                key={i}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="var(--color-zinc-500)"
                strokeWidth={1.4}
                markerEnd="url(#arch-arrow)"
              />
            );
          })}

          {/* Nodes — icon + label (+ caption) via foreignObject so we get real icons */}
          {[...placedById.values()].map((p, i) => {
            const Icon = ICON_MAP[getComponentById(p.componentId)?.icon ?? ""] ?? Server;
            return (
              <foreignObject
                key={i}
                x={p.cx - NODE_W / 2}
                y={p.cy - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1px",
                    padding: "2px 4px",
                    borderRadius: "8px",
                    border: `1px solid ${p.color}66`,
                    background: `${p.color}1f`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", maxWidth: "100%" }}>
                    <span style={{ color: p.color, display: "inline-flex", flexShrink: 0 }}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--color-zinc-100)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.label}
                    </span>
                  </div>
                  {p.caption && (
                    <span
                      style={{
                        fontSize: "8.5px",
                        lineHeight: 1.15,
                        color: "var(--color-zinc-400)",
                        textAlign: "center",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.caption}
                    </span>
                  )}
                </div>
              </foreignObject>
            );
          })}
        </svg>
      </div>

      {/* Legend — what each component is and why it's here */}
      {showLegend && legend.length > 0 && (
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
