import type { Node, Edge } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";
import { getComponentById } from "@/data/components";

/** Build a canvas node for a given component id, mirroring how the canvas store
 *  hydrates `data` from the component spec. Used by the simulator/scorer tests. */
export function makeNode(
  id: string,
  componentId: string,
  extra: Partial<ComponentNodeData> = {}
): Node<ComponentNodeData> {
  const comp = getComponentById(componentId);
  if (!comp) throw new Error(`unknown component id: ${componentId}`);
  return {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: {
      componentId,
      label: comp.label,
      icon: comp.icon,
      category: comp.category,
      replicas: 1,
      maxQPS: comp.maxQPS,
      latencyMs: comp.latencyMs,
      scalable: comp.scalable,
      ...extra,
    },
  };
}

export function makeEdge(source: string, target: string): Edge {
  return { id: `${source}-${target}`, source, target };
}
