import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useCanvasStore, sanitizeEdges, type ComponentNodeData } from "./canvasStore";
import { useAppStore } from "./appStore";
import { useSimulationStore } from "./simulationStore";
import { usePenStore, type Stroke } from "./penStore";
import { PROBLEMS } from "@/data/problems";

export interface SerializedComponentData {
  componentId: string;
  label: string;
  icon: string;
  category: string;
  replicas: number;
  maxQPS: number;
  latencyMs: number;
  scalable: boolean;
  cacheHitRate?: number;
}

export interface SerializedTextData {
  text: string;
  fontSize?: "sm" | "base" | "lg";
}

export interface SerializedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: SerializedComponentData | SerializedTextData;
}

export interface SerializedEdge {
  id: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface SavedDesign {
  id: string;
  name: string;
  problemId: string | null;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  annotations: string[];
  strokes: Stroke[];
  createdAt: string;
  updatedAt: string;
}

interface SavedDesignsState {
  designs: SavedDesign[];
  saveDesign: (name: string) => void;
  loadDesign: (id: string) => void;
  deleteDesign: (id: string) => void;
  renameDesign: (id: string, name: string) => void;
  exportDesign: (id: string) => string;
  importDesign: (json: string) => void;
}

function serializeNodes(
  nodes: ReturnType<typeof useCanvasStore.getState>["nodes"]
): SerializedNode[] {
  return nodes.map((n) => {
    const base = {
      id: n.id,
      type: n.type ?? "component",
      position: { x: n.position.x, y: n.position.y },
    };

    if (n.type === "text") {
      return {
        ...base,
        data: {
          text: (n.data.text as string) ?? "",
          fontSize: (n.data.fontSize as "sm" | "base" | "lg") ?? undefined,
        } as SerializedTextData,
      };
    }

    return {
      ...base,
      data: {
        componentId: n.data.componentId,
        label: n.data.label,
        icon: n.data.icon,
        category: n.data.category,
        replicas: n.data.replicas,
        maxQPS: n.data.maxQPS,
        latencyMs: n.data.latencyMs,
        scalable: n.data.scalable,
        cacheHitRate: n.data.cacheHitRate as number | undefined,
      } as SerializedComponentData,
    };
  });
}

function serializeEdges(
  edges: ReturnType<typeof useCanvasStore.getState>["edges"]
): SerializedEdge[] {
  return edges.map((e) => ({
    id: e.id,
    type: e.type,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
  }));
}

export const useSavedDesignsStore = create<SavedDesignsState>()(
  persist(
    (set, get) => ({
      designs: [],

      saveDesign: (name: string) => {
        const { nodes, edges } = useCanvasStore.getState();
        const { strokes } = usePenStore.getState();
        const problemId = useAppStore.getState().selectedProblemId;
        const now = new Date().toISOString();
        const id = `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const design: SavedDesign = {
          id,
          name,
          problemId,
          nodes: serializeNodes(nodes),
          edges: serializeEdges(edges),
          annotations: [],
          strokes,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({ designs: [design, ...s.designs] }));
        useAppStore.getState().showToast(`Design "${name}" saved`, "success");
      },

      loadDesign: (id: string) => {
        const design = get().designs.find((d) => d.id === id);
        if (!design) return;

        // A past simulation/score described the previous canvas.
        const sim = useSimulationStore.getState();
        sim.setResult(null);
        sim.setScoreResult(null);
        sim.setShowScore(false);

        // Restore canvas state
        const restoredNodes = design.nodes.map((n) => {
          if (n.type === "text") {
            const textData = n.data as SerializedTextData;
            return {
              id: n.id,
              type: n.type,
              position: n.position,
              connectable: false,
              data: { text: textData.text ?? "", fontSize: textData.fontSize },
            };
          }
          return {
            id: n.id,
            type: n.type,
            position: n.position,
            data: { ...n.data } as ComponentNodeData,
          };
        });

        useCanvasStore.setState({
          nodes: restoredNodes,
          edges: sanitizeEdges(
            design.edges.map((e) => ({
              id: e.id,
              type: e.type,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle ?? undefined,
              targetHandle: e.targetHandle ?? undefined,
            }))
          ),
          selectedNodeId: null,
          selectedEdgeId: null,
        });

        usePenStore.getState().setStrokes(design.strokes ?? []);

        // Restore problem selection if it exists
        if (design.problemId) {
          useAppStore.getState().setSelectedProblem(design.problemId);
        }

        useAppStore.getState().showToast(`Loaded "${design.name}"`, "success");
      },

      deleteDesign: (id: string) => {
        set((s) => ({ designs: s.designs.filter((d) => d.id !== id) }));
      },

      renameDesign: (id: string, name: string) => {
        set((s) => ({
          designs: s.designs.map((d) =>
            d.id === id
              ? { ...d, name, updatedAt: new Date().toISOString() }
              : d
          ),
        }));
      },

      exportDesign: (id: string) => {
        const design = get().designs.find((d) => d.id === id);
        if (!design) return "{}";
        return JSON.stringify(design, null, 2);
      },

      importDesign: (json: string) => {
        try {
          const parsed = JSON.parse(json) as Record<string, unknown>;
          if (
            typeof parsed.name !== "string" ||
            !Array.isArray(parsed.nodes) ||
            !Array.isArray(parsed.edges)
          ) {
            useAppStore.getState().showToast("Invalid design file", "error");
            return;
          }

          // Keep only structurally sound nodes/edges so a malformed file
          // can't put junk into the canvas when loaded.
          const nodes = (parsed.nodes as Record<string, unknown>[]).filter(
            (n): n is SerializedNode & Record<string, unknown> =>
              !!n &&
              typeof n.id === "string" &&
              typeof n.position === "object" &&
              n.position !== null &&
              Number.isFinite((n.position as { x?: unknown }).x) &&
              Number.isFinite((n.position as { y?: unknown }).y) &&
              typeof n.data === "object" &&
              n.data !== null
          );
          const edges = (parsed.edges as Record<string, unknown>[]).filter(
            (e): e is SerializedEdge & Record<string, unknown> =>
              !!e &&
              typeof e.id === "string" &&
              typeof e.source === "string" &&
              typeof e.target === "string"
          );

          if (nodes.length === 0) {
            useAppStore.getState().showToast("Design file contains no valid components", "error");
            return;
          }

          const now = new Date().toISOString();
          const design: SavedDesign = {
            id: `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: parsed.name.trim().slice(0, 80) + " (imported)",
            problemId: typeof parsed.problemId === "string" ? parsed.problemId : null,
            nodes,
            edges,
            annotations: Array.isArray(parsed.annotations) ? (parsed.annotations as string[]) : [],
            strokes: Array.isArray(parsed.strokes) ? (parsed.strokes as Stroke[]) : [],
            createdAt: now,
            updatedAt: now,
          };

          set((s) => ({ designs: [design, ...s.designs] }));
          useAppStore.getState().showToast("Design imported", "success");
        } catch {
          useAppStore.getState().showToast("Failed to parse JSON", "error");
        }
      },
    }),
    {
      name: "systemdesign-saved-designs",
    }
  )
);

/** Helper: get problem title by id */
export function getProblemTitle(problemId: string | null): string {
  if (!problemId) return "No problem";
  return PROBLEMS.find((p) => p.id === problemId)?.title ?? problemId;
}
