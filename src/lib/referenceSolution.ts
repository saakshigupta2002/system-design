import type { Node, Edge } from "@xyflow/react";
import { PROBLEMS } from "@/data/problems";
import { getComponentById } from "@/data/components";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";

/**
 * Opens the reference solution for a problem in a new read-only canvas tab.
 * Shared by the top-bar "Reference" button and the empty-state card so the
 * two can't drift apart.
 *
 * Edges in the schema reference endpoints by componentId, so we map each
 * componentId to its first node id (exact match — no prefix collisions like
 * "app" matching "app-server").
 *
 * @returns true if a reference was opened, false if the problem has none.
 */
// Node footprint used to pick which side a wire should leave/enter from.
const NODE_W = 150;
const NODE_H = 70;

/** Choose source/target handles from the two nodes' relative positions so the
 *  wire leaves the side facing its destination (e.g. a node above connects
 *  bottom→top) instead of always right→left. */
function pickHandles(
  s: { x: number; y: number },
  t: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  // Compare center-to-center on each axis; the dominant axis wins.
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }
  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" };
}

export function openReferenceSolution(problemId: string): boolean {
  const problem = PROBLEMS.find((p) => p.id === problemId);
  if (!problem) return false;

  const nodeIdMap = new Map<string, string>(); // componentId -> first node id
  const posMap = new Map<string, { x: number; y: number }>(); // componentId -> center
  const refNodes: Node<ComponentNodeData>[] = [];

  problem.referenceSolution.nodes.forEach((ref, index) => {
    const comp = getComponentById(ref.componentId);
    if (!comp) return;
    const nodeId = `${comp.id}-ref-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (!nodeIdMap.has(ref.componentId)) {
      nodeIdMap.set(ref.componentId, nodeId);
      posMap.set(ref.componentId, { x: ref.x + NODE_W / 2, y: ref.y + NODE_H / 2 });
    }
    refNodes.push({
      id: nodeId,
      type: "component",
      position: { x: ref.x, y: ref.y },
      data: {
        componentId: comp.id,
        label: comp.label,
        icon: comp.icon,
        category: comp.category,
        replicas: 1,
        maxQPS: comp.maxQPS,
        latencyMs: comp.latencyMs,
        scalable: comp.scalable,
      },
    });
  });

  const refEdges: Edge[] = [];
  for (const ref of problem.referenceSolution.edges) {
    const sourceId = nodeIdMap.get(ref.source);
    const targetId = nodeIdMap.get(ref.target);
    const sPos = posMap.get(ref.source);
    const tPos = posMap.get(ref.target);
    if (sourceId && targetId && sPos && tPos) {
      const { sourceHandle, targetHandle } = pickHandles(sPos, tPos);
      refEdges.push({
        id: `e-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        sourceHandle,
        targetHandle,
        type: "animated",
      });
    }
  }

  useCanvasStore.getState().addTab({
    id: `ref-${problem.id}`,
    label: `${problem.title} (Reference)`,
    nodes: refNodes,
    edges: refEdges,
    readOnly: true,
  });
  return true;
}
