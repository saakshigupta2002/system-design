import type { Node, Edge } from "@xyflow/react";

const COL_W = 230;
const ROW_H = 120;
const ORIGIN_X = 80;
const ORIGIN_Y = 80;

/**
 * Layered ("tidy up") layout: columns are dependency depth (hops from the
 * entry point), rows keep the nodes' current vertical order. Same approach as
 * the editorial diagrams, applied to live canvas nodes.
 */
export function computeLayeredPositions(
  nodes: Node[],
  edges: Edge[]
): Map<string, { x: number; y: number }> {
  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);

  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  for (const id of ids) {
    adj.set(id, []);
    indeg.set(id, 0);
  }
  const pairSeen = new Set<string>();
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    const key = `${e.source}→${e.target}`;
    if (pairSeen.has(key)) continue;
    pairSeen.add(key);
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  }

  // Longest-path layering (Kahn's algorithm).
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

  // Group into columns; preserve each node's current vertical order.
  const yById = new Map(nodes.map((n) => [n.id, n.position.y]));
  const cols = new Map<number, string[]>();
  for (const id of ids) {
    const d = depth.get(id)!;
    if (!cols.has(d)) cols.set(d, []);
    cols.get(d)!.push(id);
  }
  for (const colIds of cols.values()) {
    colIds.sort((a, b) => (yById.get(a) ?? 0) - (yById.get(b) ?? 0));
  }

  const maxRows = Math.max(...[...cols.values()].map((c) => c.length));
  const positions = new Map<string, { x: number; y: number }>();
  for (const [d, colIds] of cols) {
    // Center shorter columns vertically against the tallest one.
    const yOffset = ((maxRows - colIds.length) * ROW_H) / 2;
    colIds.forEach((id, i) => {
      positions.set(id, {
        x: ORIGIN_X + d * COL_W,
        y: ORIGIN_Y + yOffset + i * ROW_H,
      });
    });
  }
  return positions;
}
