import {
  useCanvasStore,
  sanitizeEdges,
  type ComponentNodeData,
  type CustomEdgeData,
} from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import { useSimulationStore } from "@/store/simulationStore";
import { serializeNodes, type SerializedNode, type SerializedTextData } from "@/store/savedDesignsStore";

/**
 * Shareable design links — the whole design is encoded into the URL hash, so a
 * link can be opened by anyone with no backend, accounts, or storage.
 */

interface SharedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: CustomEdgeData;
}

interface SharedPayload {
  v: 1;
  p?: string; // selected problem id (for context on open)
  n: SerializedNode[];
  e: SharedEdge[];
}

// URL-safe base64 of a UTF-8 string.
function b64urlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  return decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
}

/** Build a shareable link for the current design, or null if the canvas is empty. */
export function createShareLink(): string | null {
  const { nodes, edges } = useCanvasStore.getState();
  if (nodes.length === 0) return null;
  const payload: SharedPayload = {
    v: 1,
    p: useAppStore.getState().selectedProblemId,
    n: serializeNodes(nodes),
    e: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      data: e.data as CustomEdgeData | undefined,
    })),
  };
  const enc = b64urlEncode(JSON.stringify(payload));
  return `${window.location.origin}${window.location.pathname}#d=${enc}`;
}

/**
 * If the URL hash contains a shared design (`#d=...`), load it onto the canvas,
 * select its problem, and clear the hash. Returns true if a design was applied.
 */
export function applySharedDesignFromHash(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  if (!hash.startsWith("#d=")) return false;
  try {
    const payload = JSON.parse(b64urlDecode(hash.slice(3))) as SharedPayload;
    if (!Array.isArray(payload.n) || !Array.isArray(payload.e)) return false;

    const restoredNodes = payload.n.map((n) => {
      if (n.type === "text") {
        const td = n.data as SerializedTextData;
        return {
          id: n.id,
          type: n.type,
          position: n.position,
          connectable: false,
          data: { text: td.text ?? "", fontSize: td.fontSize },
        };
      }
      return {
        id: n.id,
        type: n.type,
        position: n.position,
        data: { ...n.data } as ComponentNodeData,
      };
    });

    const restoredEdges = sanitizeEdges(
      payload.e.map((e) => ({
        id: e.id,
        type: "animated",
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        data: e.data,
      }))
    );

    // A shared design replaces the canvas — clear any prior sim/score state.
    const sim = useSimulationStore.getState();
    sim.setResult(null);
    sim.setScoreResult(null);
    sim.setShowScore(false);
    sim.clearFailed();

    useCanvasStore.setState({
      nodes: restoredNodes,
      edges: restoredEdges,
      selectedNodeId: null,
      selectedEdgeId: null,
      past: [],
      future: [],
    });

    if (payload.p) useAppStore.getState().setSelectedProblem(payload.p);

    // Drop the hash so a refresh doesn't re-import.
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
    return true;
  } catch {
    return false;
  }
}
