"use client";

import { useCallback, useEffect, useState } from "react";
import { ReactFlowProvider, type Node } from "@xyflow/react";
import { X } from "lucide-react";
import { TopBar } from "./top-bar";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { RightPanel } from "@/components/panel/RightPanel";
import { DesignCanvas } from "@/components/canvas/DesignCanvas";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { usePenStore } from "@/store/penStore";
import { useSimulationStore } from "@/store/simulationStore";
import { runSimulation } from "@/engine/simulator";
import { scoreDesign } from "@/scoring/scorer";
import { openReferenceSolution } from "@/lib/referenceSolution";
import { markCompleted } from "@/lib/learningProgress";
import { applySharedDesignFromHash } from "@/lib/shareDesign";
import { useScoreHistoryStore } from "@/store/scoreHistoryStore";
import { Toast } from "@/components/ui/Toast";
import { SaveDialog } from "@/components/dialogs/SaveDialog";
import { LoadDialog } from "@/components/dialogs/LoadDialog";
import { InterviewBar } from "@/components/interview/InterviewBar";
import { InterviewStartDialog } from "@/components/interview/InterviewStartDialog";
import { CreateProblemDialog } from "@/components/dialogs/CreateProblemDialog";
import { CreateComponentDialog } from "@/components/dialogs/CreateComponentDialog";
import { EditorialDialog } from "@/components/dialogs/EditorialDialog";
import { SpotTheFlawDialog } from "@/components/dialogs/SpotTheFlawDialog";
import { ShortcutsDialog } from "@/components/dialogs/ShortcutsDialog";
import { AIAssistantPanel } from "@/components/ai/AIAssistantPanel";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { useInterviewStore } from "@/store/interviewStore";
import { useIsMobile } from "@/hooks/useBreakpoint";

export function AppShell() {
  const isMobile = useIsMobile();
  const leftSidebarOpen = useAppStore((s) => s.leftSidebarOpen);
  const rightPanelOpen = useAppStore((s) => s.rightPanelOpen);
  const toggleLeftSidebar = useAppStore((s) => s.toggleLeftSidebar);
  const toggleRightPanel = useAppStore((s) => s.toggleRightPanel);

  // Mobile drawer state — local, does not persist
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [createProblemDialogOpen, setCreateProblemDialogOpen] = useState(false);
  const [createComponentDialogOpen, setCreateComponentDialogOpen] = useState(false);
  const [editorialDialogOpen, setEditorialDialogOpen] = useState(false);
  const [spotFlawDialogOpen, setSpotFlawDialogOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [editProblemId, setEditProblemId] = useState<string | null>(null);
  const [editComponentId, setEditComponentId] = useState<string | null>(null);

  const interviewMode = useInterviewStore((s) => s.mode);
  const timerRunning = useInterviewStore((s) => s.timerRunning);
  const tickTimer = useInterviewStore((s) => s.tickTimer);

  const handleToggleLeft = useCallback(() => {
    if (isMobile) setMobileSidebarOpen((v) => !v);
    else toggleLeftSidebar();
  }, [isMobile, toggleLeftSidebar]);

  const handleToggleRight = useCallback(() => {
    if (isMobile) setMobileRightOpen((v) => !v);
    else toggleRightPanel();
  }, [isMobile, toggleRightPanel]);

  // Close any open mobile drawers when we transition to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
      setMobileRightOpen(false);
    }
  }, [isMobile]);

  const handleSave = useCallback(() => setSaveDialogOpen(true), []);
  const handleLoad = useCallback(() => setLoadDialogOpen(true), []);
  const handleSimulate = useCallback(() => {
    const { nodes, edges } = useCanvasStore.getState();
    const { config } = useSimulationStore.getState();

    const componentNodes = nodes.filter((n) => n.type !== "text") as Node<ComponentNodeData>[];

    if (componentNodes.length === 0) {
      useAppStore.getState().showToast("No components to simulate", "info");
      return;
    }

    // Show the results where they land
    useAppStore.getState().setActiveRightTab("simulation");
    if (isMobile) setMobileRightOpen(true);

    useSimulationStore.getState().setRunning(true);
    const failed = new Set(useSimulationStore.getState().failedNodeIds);

    setTimeout(() => {
      const result = runSimulation(componentNodes, edges, config.requestsPerSec, failed);

      const updates = new Map<string, Record<string, unknown>>();
      for (const [nodeId, metrics] of result.nodeMetrics) {
        updates.set(nodeId, {
          utilization: metrics.utilization,
          status: metrics.status,
          isBottleneck: metrics.isBottleneck,
        });
      }
      useCanvasStore.getState().updateAllNodeData(updates);

      useSimulationStore.getState().setResult(result);
      useSimulationStore.getState().setRunning(false);
      useAppStore.getState().showToast("Simulation complete!", "success");
    }, 100);
  }, [isMobile]);

  // Live chaos: once a simulation has run, toggling a component's power
  // re-runs the snapshot quietly so the cascade updates on the canvas at once.
  const failedNodeIds = useSimulationStore((s) => s.failedNodeIds);
  useEffect(() => {
    if (!useSimulationStore.getState().result || useSimulationStore.getState().isRamping) return;
    const { nodes, edges } = useCanvasStore.getState();
    const componentNodes = nodes.filter((n) => n.type !== "text") as Node<ComponentNodeData>[];
    if (componentNodes.length === 0) return;
    const res = runSimulation(
      componentNodes,
      edges,
      useSimulationStore.getState().config.requestsPerSec,
      new Set(failedNodeIds)
    );
    const updates = new Map<string, Record<string, unknown>>();
    for (const [nid, m] of res.nodeMetrics) {
      updates.set(nid, { utilization: m.utilization, status: m.status, isBottleneck: m.isBottleneck });
    }
    useCanvasStore.getState().updateAllNodeData(updates);
    useSimulationStore.getState().setResult(res);
  }, [failedNodeIds]);

  const handleScore = useCallback(() => {
    const { nodes, edges } = useCanvasStore.getState();
    const componentNodes = nodes.filter((n) => n.type !== "text") as Node<ComponentNodeData>[];

    if (componentNodes.length === 0) {
      useAppStore.getState().showToast("No components to score", "info");
      return;
    }

    const result = scoreDesign(componentNodes, edges);
    useSimulationStore.getState().setScoreResult(result);
    useSimulationStore.getState().setShowScore(true);
    useAppStore.getState().setActiveRightTab("score");

    // On mobile, auto-open the right sheet so the score is visible
    if (isMobile) setMobileRightOpen(true);

    // Record the attempt; a 71+ ("Excellent") score completes the problem
    // in the Learn path.
    const problemId = useAppStore.getState().selectedProblemId;
    useScoreHistoryStore.getState().addEntry({
      problemId,
      total: result.total,
      verdict: result.verdict,
    });
    if (result.total >= 71 && !problemId.startsWith("custom-")) {
      if (markCompleted(problemId)) {
        useAppStore.getState().showToast("Scored 71+ — marked complete in the Learn path", "success");
        return;
      }
    }

    useAppStore.getState().showToast("Design scored!", "success");
  }, [isMobile]);

  const handleClearCanvas = useCallback(() => {
    useCanvasStore.getState().clearCanvas();
    usePenStore.getState().clearAll();
    useAppStore.getState().showToast("Canvas cleared", "info");
  }, []);

  const handlePickProblem = useCallback(() => {
    useAppStore.getState().setActiveLeftTab("problems");
    if (isMobile) setMobileSidebarOpen(true);
    else useAppStore.getState().setLeftSidebarOpen(true);
  }, [isMobile]);

  const handleLoadReference = useCallback(() => {
    const problemId = useAppStore.getState().selectedProblemId;
    if (problemId.startsWith("custom-")) {
      useAppStore.getState().showToast("Custom problems don't have a reference solution", "info");
      return;
    }
    if (openReferenceSolution(problemId)) {
      useAppStore.getState().showToast("Reference opened in new tab", "success");
    } else {
      useAppStore.getState().showToast("Pick a problem first", "info");
      handlePickProblem();
    }
  }, [handlePickProblem]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const { selection, deleteSelection, selectedNodeId, deleteNode, selectedEdgeId, deleteEdge } =
          useCanvasStore.getState();
        if (selection.nodeIds.length + selection.edgeIds.length > 1) {
          e.preventDefault();
          deleteSelection();
        } else if (selectedNodeId) {
          e.preventDefault();
          deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          e.preventDefault();
          deleteEdge(selectedEdgeId);
        } else if (selection.nodeIds.length + selection.edgeIds.length === 1) {
          e.preventDefault();
          deleteSelection();
        }
      }

      if (e.key === "c" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const { selectedNodeId, copyNode } = useCanvasStore.getState();
        // Don't hijack copy when the user has text selected on the page.
        if (selectedNodeId && window.getSelection()?.toString() === "") {
          e.preventDefault();
          copyNode(selectedNodeId);
          useAppStore.getState().showToast("Component copied — ⌘V to paste", "info");
        }
      }

      if (e.key === "v" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const { clipboard, pasteNode } = useCanvasStore.getState();
        if (clipboard) {
          e.preventDefault();
          pasteNode();
        }
      }

      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSimulate();
      }

      if (e.key === "s" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        handleScore();
      }

      if ((e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) useCanvasStore.getState().redo();
        else useCanvasStore.getState().undo();
      }

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }

      if (e.key === "s" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setSaveDialogOpen(true);
      }

      if (e.key === "o" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setLoadDialogOpen(true);
      }

      if (e.key === "Escape") {
        if (mobileSidebarOpen) setMobileSidebarOpen(false);
        else if (mobileRightOpen) setMobileRightOpen(false);
        else useCanvasStore.getState().setSelectedNode(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSimulate, handleScore, mobileSidebarOpen, mobileRightOpen]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, tickTimer]);

  // Load a shared design from the URL hash on first mount (#d=...).
  useEffect(() => {
    if (applySharedDesignFromHash()) {
      useAppStore.getState().showToast("Loaded shared design", "success");
    }
  }, []);

  // One-time hint once the user starts building: the empty-state shortcut
  // tips disappear forever after the first node, so point at the cheatsheet.
  useEffect(() => {
    const HINT_KEY = "systemdesign-shortcuts-hint-shown";
    if (typeof window === "undefined" || localStorage.getItem(HINT_KEY)) return;
    const unsub = useCanvasStore.subscribe((state) => {
      if (state.nodes.length > 0) {
        localStorage.setItem(HINT_KEY, "1");
        useAppStore.getState().showToast("Tip: press ? to see all keyboard shortcuts", "info");
        unsub();
      }
    });
    return unsub;
  }, []);

  return (
    <ReactFlowProvider>
      <div className="flex h-full flex-col">
        {interviewMode === "interview" && <InterviewBar />}
        <TopBar
          onSimulate={handleSimulate}
          onClearCanvas={() => setClearConfirmOpen(true)}
          onSave={handleSave}
          onLoad={handleLoad}
          onStartInterview={() => setInterviewDialogOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onToggleAI={() => setAiOpen((v) => !v)}
          onToggleLeft={handleToggleLeft}
          onToggleRight={handleToggleRight}
        />

        <div className="relative flex flex-1 overflow-hidden">
          {/* Desktop inline sidebar (hidden on mobile) */}
          <Sidebar
            open={leftSidebarOpen}
            onCreateProblem={() => setCreateProblemDialogOpen(true)}
            onEditProblem={(id) => {
              setEditProblemId(id);
              setCreateProblemDialogOpen(true);
            }}
            onCreateCustomComponent={() => setCreateComponentDialogOpen(true)}
            onEditCustomComponent={(id) => {
              setEditComponentId(id);
              setCreateComponentDialogOpen(true);
            }}
            onOpenEditorial={() => setEditorialDialogOpen(true)}
            onOpenSpotFlaw={() => setSpotFlawDialogOpen(true)}
            variant="desktop"
          />

          <DesignCanvas
            onPickProblem={handlePickProblem}
            onLoadReference={handleLoadReference}
            onStartInterview={() => setInterviewDialogOpen(true)}
            onClearCanvas={() => setClearConfirmOpen(true)}
          />

          {/* Desktop inline right panel (hidden on mobile) */}
          <RightPanel open={rightPanelOpen} onSimulate={handleSimulate} onScore={handleScore} variant="desktop" />

          {/* Mobile: sidebar drawer from left */}
          {isMobile && (
            <>
              {/* Backdrop */}
              <div
                className={`absolute inset-0 z-30 bg-black/60 transition-opacity md:hidden ${
                  mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={() => setMobileSidebarOpen(false)}
              />
              {/* Drawer */}
              <div
                className={`absolute inset-y-0 left-0 z-40 flex w-[85%] max-w-[320px] flex-col border-r border-zinc-800 bg-zinc-900 shadow-xl transition-transform md:hidden ${
                  mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                aria-hidden={!mobileSidebarOpen}
                inert={!mobileSidebarOpen || undefined}
              >
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 px-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Library</span>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    aria-label="Close sidebar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-h-0 flex-1">
                  <Sidebar
                    onCreateProblem={() => {
                      setCreateProblemDialogOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                    onEditProblem={(id) => {
                      setEditProblemId(id);
                      setCreateProblemDialogOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                    onCreateCustomComponent={() => {
                      setCreateComponentDialogOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                    onEditCustomComponent={(id) => {
                      setEditComponentId(id);
                      setCreateComponentDialogOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                    onOpenEditorial={() => {
                      setEditorialDialogOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                    onOpenSpotFlaw={() => {
                      setSpotFlawDialogOpen(true);
                      setMobileSidebarOpen(false);
                    }}
                    variant="mobile"
                  />
                </div>
              </div>

              {/* Mobile: right panel as bottom sheet */}
              <div
                className={`absolute inset-0 z-30 bg-black/60 transition-opacity md:hidden ${
                  mobileRightOpen ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={() => setMobileRightOpen(false)}
              />
              <div
                className={`absolute inset-x-0 bottom-0 z-40 flex max-h-[85%] flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-900 shadow-2xl transition-transform md:hidden ${
                  mobileRightOpen ? "translate-y-0" : "translate-y-full"
                }`}
                aria-hidden={!mobileRightOpen}
                inert={!mobileRightOpen || undefined}
              >
                <div className="flex shrink-0 items-center justify-between pt-2">
                  <div className="flex-1" />
                  <div className="sheet-handle" />
                  <div className="flex flex-1 justify-end pr-3">
                    <button
                      onClick={() => setMobileRightOpen(false)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      aria-label="Close panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 pb-[env(safe-area-inset-bottom)]">
                  <RightPanel onSimulate={handleSimulate} onScore={handleScore} variant="mobile" />
                </div>
              </div>
            </>
          )}
        </div>

        <Toast />

        <SaveDialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} />
        <LoadDialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} />
        <InterviewStartDialog open={interviewDialogOpen} onClose={() => setInterviewDialogOpen(false)} />
        <CreateProblemDialog
          open={createProblemDialogOpen}
          editId={editProblemId}
          onClose={() => {
            setCreateProblemDialogOpen(false);
            setEditProblemId(null);
          }}
        />
        <CreateComponentDialog
          open={createComponentDialogOpen}
          editId={editComponentId}
          onClose={() => {
            setCreateComponentDialogOpen(false);
            setEditComponentId(null);
          }}
        />
        <EditorialDialog open={editorialDialogOpen} onClose={() => setEditorialDialogOpen(false)} />
        <SpotTheFlawDialog open={spotFlawDialogOpen} onClose={() => setSpotFlawDialogOpen(false)} />
        <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <AIAssistantPanel open={aiOpen} onClose={() => setAiOpen(false)} />
        <ConfirmDialog
          open={clearConfirmOpen}
          title="Clear canvas?"
          message="This removes every component, wire, and drawing from the current tab. You can bring them back with Undo (⌘Z)."
          confirmText="Clear canvas"
          danger
          onConfirm={handleClearCanvas}
          onClose={() => setClearConfirmOpen(false)}
        />
      </div>
    </ReactFlowProvider>
  );
}
