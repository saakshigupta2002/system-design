import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";

export interface ComponentNodeData {
  componentId: string;
  label: string;
  icon: string;
  category: string;
  replicas: number;
  maxQPS: number;
  latencyMs: number;
  scalable: boolean;
  utilization?: number;
  status?: string;
  isBottleneck?: boolean;
  // ReactFlow v12 requires an index signature on custom node data types
  [key: string]: unknown;
}

export interface TextNodeData {
  text: string;
  fontSize?: "sm" | "base" | "lg";
  [key: string]: unknown;
}

export interface CustomEdgeData {
  label?: string;
  protocol?: 'http' | 'grpc' | 'websocket' | 'pubsub' | 'tcp' | 'custom';
  async?: boolean;
  [key: string]: unknown;
}

export interface CanvasTab {
  id: string;
  label: string;
  nodes: Node[];
  edges: Edge[];
  readOnly?: boolean;
}

// The only handle ids ComponentNode renders. Edges created by older builds may
// carry stale ids (e.g. "t-tgt") that no longer exist — those edges silently
// fail to render while still poisoning the simulation graph.
const VALID_HANDLE_IDS = new Set(["top", "right", "bottom", "left"]);

/** Drop self-loops and normalize missing/stale handle ids to right→left. */
export function sanitizeEdges(edges: Edge[] | undefined): Edge[] {
  return (edges ?? [])
    .filter((e) => e.source !== e.target)
    .map((e) => ({
      ...e,
      sourceHandle:
        e.sourceHandle && VALID_HANDLE_IDS.has(e.sourceHandle) ? e.sourceHandle : "right",
      targetHandle:
        e.targetHandle && VALID_HANDLE_IDS.has(e.targetHandle) ? e.targetHandle : "left",
    }));
}

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Tab system
  tabs: CanvasTab[];
  activeTabId: string;
  addTab: (tab: CanvasTab) => void;
  switchTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, label: string) => void;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<ComponentNodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<CustomEdgeData>) => void;
  updateAllNodeData: (
    updates: Map<string, Partial<ComponentNodeData>>
  ) => void;
  clearCanvas: () => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, _get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,

      // Tab system — "my-design" is the default tab
      tabs: [{ id: "my-design", label: "My Design", nodes: [], edges: [] }],
      activeTabId: "my-design",

      addTab: (tab) => {
        set((state) => {
          // Save current tab state before switching
          const updatedTabs = state.tabs.map((t) =>
            t.id === state.activeTabId ? { ...t, nodes: state.nodes, edges: state.edges } : t
          );
          // Check if tab already exists (reuse it)
          const existing = updatedTabs.find((t) => t.id === tab.id);
          if (existing) {
            return {
              tabs: updatedTabs.map((t) => (t.id === tab.id ? { ...t, ...tab } : t)),
              activeTabId: tab.id,
              nodes: tab.nodes,
              edges: tab.edges,
              selectedNodeId: null,
              selectedEdgeId: null,
            };
          }
          return {
            tabs: [...updatedTabs, tab],
            activeTabId: tab.id,
            nodes: tab.nodes,
            edges: tab.edges,
            selectedNodeId: null,
            selectedEdgeId: null,
          };
        });
      },

      switchTab: (tabId) => {
        set((state) => {
          const target = state.tabs.find((t) => t.id === tabId);
          if (!target || tabId === state.activeTabId) return state;
          // Save current tab state
          const updatedTabs = state.tabs.map((t) =>
            t.id === state.activeTabId ? { ...t, nodes: state.nodes, edges: state.edges } : t
          );
          return {
            tabs: updatedTabs,
            activeTabId: tabId,
            nodes: target.nodes,
            edges: target.edges,
            selectedNodeId: null,
            selectedEdgeId: null,
          };
        });
      },

      closeTab: (tabId) => {
        set((state) => {
          if (tabId === "my-design") return state; // Can't close the main tab
          const remaining = state.tabs.filter((t) => t.id !== tabId);
          if (state.activeTabId === tabId) {
            // Switch to my-design tab
            const myDesign = remaining.find((t) => t.id === "my-design") ?? remaining[0];
            return {
              tabs: remaining,
              activeTabId: myDesign.id,
              nodes: myDesign.nodes,
              edges: myDesign.edges,
              selectedNodeId: null,
              selectedEdgeId: null,
            };
          }
          return { tabs: remaining };
        });
      },

      renameTab: (tabId, label) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, label } : t)),
        }));
      },

      onNodesChange: (changes) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes) as Node[],
        }));
      },
      onEdgesChange: (changes) => {
        set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }));
      },
      onConnect: (connection) => {
        // A node connected to itself adds an inbound edge that breaks entry-
        // point detection in the simulator — never useful, so block it.
        if (connection.source === connection.target) return;
        set((state) => ({
          edges: addEdge(
            { ...connection, type: "animated", data: { label: '', protocol: 'http', async: false } satisfies CustomEdgeData },
            state.edges
          ),
        }));
      },
      addNode: (node) => {
        set((state) => ({ nodes: [...state.nodes, node] }));
      },
      setSelectedNode: (id) => {
        set({ selectedNodeId: id, selectedEdgeId: null });
      },
      setSelectedEdge: (id) => {
        set({ selectedEdgeId: id, selectedNodeId: null });
      },
      updateNodeData: (nodeId, data) => {
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
          ),
        }));
      },
      updateEdgeData: (edgeId, data) => {
        set((state) => ({
          edges: state.edges.map((e) =>
            e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e
          ),
        }));
      },
      updateAllNodeData: (updates) => {
        set((state) => ({
          nodes: state.nodes.map((n) => {
            const update = updates.get(n.id);
            return update ? { ...n, data: { ...n.data, ...update } } : n;
          }),
        }));
      },
      clearCanvas: () => {
        set({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null });
      },
      deleteNode: (nodeId) => {
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== nodeId),
          edges: state.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
          selectedNodeId:
            state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        }));
      },
      deleteEdge: (edgeId) => {
        set((state) => ({
          edges: state.edges.filter((e) => e.id !== edgeId),
          selectedEdgeId:
            state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
        }));
      },
    }),
    {
      name: "systemdesign-canvas",
      version: 1,
      // One-time cleanup of designs saved by older builds: drops self-loops
      // and stale handle ids that broke entry-point detection in simulations.
      migrate: (persisted) => {
        const s = persisted as {
          nodes?: Node[];
          edges?: Edge[];
          tabs?: CanvasTab[];
          activeTabId?: string;
        };
        return {
          ...s,
          edges: sanitizeEdges(s.edges),
          tabs: (s.tabs ?? []).map((t) => ({ ...t, edges: sanitizeEdges(t.edges) })),
        };
      },
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
