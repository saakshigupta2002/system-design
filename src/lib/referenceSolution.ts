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
export function openReferenceSolution(problemId: string): boolean {
  const problem = PROBLEMS.find((p) => p.id === problemId);
  if (!problem) return false;

  const nodeIdMap = new Map<string, string>(); // componentId -> first node id
  const refNodes: Node<ComponentNodeData>[] = [];

  problem.referenceSolution.nodes.forEach((ref, index) => {
    const comp = getComponentById(ref.componentId);
    if (!comp) return;
    const nodeId = `${comp.id}-ref-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (!nodeIdMap.has(ref.componentId)) nodeIdMap.set(ref.componentId, nodeId);
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
    if (sourceId && targetId) {
      refEdges.push({
        id: `e-${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
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
