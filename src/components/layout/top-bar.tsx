"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  ChevronDown,
  Zap,
  PanelLeft,
  PanelRight,
  Trash2,
  Download,
  ImageIcon,
  FileCode2,
  FileJson,
  Save,
  FolderOpen,
  StickyNote,
  GraduationCap,
  MoreHorizontal,
  Keyboard,
  LayoutGrid,
  Sparkles,
  Sun,
  Moon,
  Share2,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore } from "@/store/canvasStore";
import { usePenStore } from "@/store/penStore";
import { PROBLEMS } from "@/data/problems";
import { useCustomProblemsStore } from "@/store/customProblemsStore";
import { type Node, useReactFlow } from "@xyflow/react";
import { exportAsPng, exportAsSvg, exportAsJSON } from "@/lib/exportCanvas";
import { openReferenceSolution } from "@/lib/referenceSolution";
import { createShareLink } from "@/lib/shareDesign";

interface TopBarProps {
  onSimulate: () => void;
  onClearCanvas: () => void;
  onSave: () => void;
  onLoad: () => void;
  onStartInterview: () => void;
  onOpenShortcuts: () => void;
  onToggleAI: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

export function TopBar({ onSimulate, onClearCanvas, onSave, onLoad, onStartInterview, onOpenShortcuts, onToggleAI, onToggleLeft, onToggleRight }: TopBarProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const { getViewport, fitView } = useReactFlow();
  const addNode = useCanvasStore((s) => s.addNode);

  const tidyUp = useCallback(() => {
    useCanvasStore.getState().autoArrange();
    // Let the new positions land before framing them.
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50);
  }, [fitView]);

  const shareDesign = useCallback(async () => {
    const link = createShareLink();
    if (!link) {
      useAppStore.getState().showToast("Add some components first", "info");
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      useAppStore.getState().showToast("Share link copied to clipboard", "success");
    } catch {
      // Clipboard blocked — surface the link so they can copy it manually.
      window.prompt("Copy your shareable link:", link);
    }
  }, []);

  const selectedProblemId = useAppStore((s) => s.selectedProblemId);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const customProblems = useCustomProblemsStore((s) => s.problems);
  const currentProblem =
    PROBLEMS.find((p) => p.id === selectedProblemId) ??
    customProblems.find((p) => p.id === selectedProblemId);

  const addTextNote = useCallback(() => {
    const { x, y, zoom } = getViewport();
    const centerX = (-x + window.innerWidth / 2) / zoom;
    const centerY = (-y + window.innerHeight / 2) / zoom;

    const newNode: Node = {
      id: `text-${crypto.randomUUID()}`,
      type: "text",
      position: { x: centerX, y: centerY },
      data: { text: "" },
      connectable: false,
    };
    addNode(newNode);
  }, [getViewport, addNode]);

  const handleExportPng = useCallback(async () => {
    setExportOpen(false);
    const name = currentProblem?.title ?? "design";
    try {
      await exportAsPng(name);
      useAppStore.getState().showToast("Exported as PNG", "success");
    } catch {
      useAppStore.getState().showToast("Export failed", "error");
    }
  }, [currentProblem]);

  const handleExportSvg = useCallback(async () => {
    setExportOpen(false);
    const name = currentProblem?.title ?? "design";
    try {
      await exportAsSvg(name);
      useAppStore.getState().showToast("Exported as SVG", "success");
    } catch {
      useAppStore.getState().showToast("Export failed", "error");
    }
  }, [currentProblem]);

  const handleExportJson = useCallback(() => {
    setExportOpen(false);
    const name = currentProblem?.title ?? "design";
    const { nodes, edges } = useCanvasStore.getState();
    const { strokes } = usePenStore.getState();
    if (nodes.length === 0 && strokes.length === 0) {
      useAppStore.getState().showToast("Nothing to export", "info");
      return;
    }
    exportAsJSON(nodes, edges, name, strokes);
    useAppStore.getState().showToast("Exported as JSON", "success");
  }, [currentProblem]);

  // Keyboard shortcut: Ctrl/Cmd+E → Export as PNG
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "e" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        handleExportPng();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExportPng]);

  const loadReference = useCallback(() => {
    // Open reference in a NEW tab — user's design stays in "My Design" tab
    if (openReferenceSolution(selectedProblemId)) {
      useAppStore.getState().showToast("Reference opened in new tab — your design is safe", "success");
    }
  }, [selectedProblemId]);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-2 md:gap-3 md:px-3">
      {/* Left section */}
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <button
          onClick={onToggleLeft}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-500" />
          <span className="hidden text-sm font-semibold tracking-tight text-zinc-100 sm:inline">
            SystemDesign
          </span>
          <span className="hidden rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 md:inline">beta</span>
        </div>

        <div className="mx-1 hidden h-4 w-px bg-zinc-800 md:block" />

        {selectedProblemId && !selectedProblemId.startsWith("custom-") && (
          <button
            onClick={loadReference}
            className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 md:flex"
            title="Load reference solution"
          >
            <Download className="h-3 w-3" />
            Reference
          </button>
        )}

        <div className="mx-1 hidden h-4 w-px bg-zinc-800 md:block" />

        <button
          onClick={addTextNote}
          className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 md:flex"
          title="Add text note to canvas"
        >
          <StickyNote className="h-3 w-3" />
          Add Note
        </button>

        <button
          onClick={tidyUp}
          className="hidden shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 md:flex"
          title="Auto-arrange the canvas into clean layers"
        >
          <LayoutGrid className="h-3 w-3" />
          Tidy Up
        </button>

        <div className="mx-1 hidden h-4 w-px bg-zinc-800 md:block" />

        <button
          onClick={onStartInterview}
          className="hidden shrink-0 items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100 md:flex"
          title="Start a guided interview practice"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Practice Interview
        </button>

        {/* Mobile-only overflow menu */}
        <div className="relative md:hidden">
          <button
            onClick={() => setMobileMoreOpen((v) => !v)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            title="More actions"
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {mobileMoreOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMobileMoreOpen(false)} />
              <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
                {/* Design actions */}
                {selectedProblemId && !selectedProblemId.startsWith("custom-") && (
                  <button
                    onClick={() => { setMobileMoreOpen(false); loadReference(); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    <Download className="h-3.5 w-3.5 text-zinc-500" />
                    Load reference solution
                  </button>
                )}
                <button
                  onClick={() => { setMobileMoreOpen(false); addTextNote(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <StickyNote className="h-3.5 w-3.5 text-zinc-500" />
                  Add text note
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); tidyUp(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-zinc-500" />
                  Tidy up layout
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); onStartInterview(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-zinc-500" />
                  Practice interview
                </button>

                <div className="my-1 h-px bg-zinc-800" />

                {/* File */}
                <button
                  onClick={() => { setMobileMoreOpen(false); shareDesign(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <Share2 className="h-3.5 w-3.5 text-zinc-500" />
                  Share link
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); onSave(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <Save className="h-3.5 w-3.5 text-zinc-500" />
                  Save design
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); onLoad(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-zinc-500" />
                  Load design
                </button>

                <div className="my-1 h-px bg-zinc-800" />

                {/* Export */}
                <button
                  onClick={() => { setMobileMoreOpen(false); handleExportPng(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-zinc-500" />
                  Export as PNG
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); handleExportSvg(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <FileCode2 className="h-3.5 w-3.5 text-zinc-500" />
                  Export as SVG
                </button>
                <button
                  onClick={() => { setMobileMoreOpen(false); handleExportJson(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  <FileJson className="h-3.5 w-3.5 text-zinc-500" />
                  Export as JSON
                </button>

                <div className="my-1 h-px bg-zinc-800" />

                {/* Danger */}
                <button
                  onClick={() => { setMobileMoreOpen(false); onClearCanvas(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs text-rose-400 transition-colors hover:bg-zinc-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear canvas
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1 md:gap-2">
        <button
          onClick={onSave}
          className="hidden h-7 items-center gap-1 rounded-md px-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 md:flex"
          title="Save design (Ctrl+S)"
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save</span>
        </button>
        <button
          onClick={onLoad}
          className="hidden h-7 items-center gap-1 rounded-md px-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 md:flex"
          title="Load design (Ctrl+O)"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Load</span>
        </button>
        <button
          onClick={shareDesign}
          className="hidden h-7 items-center gap-1 rounded-md px-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 md:flex"
          title="Copy a shareable link to this design"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <div className="hidden h-4 w-px bg-zinc-800 md:block" />

        {/* Export dropdown — desktop only; mobile goes through overflow menu */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setExportOpen(!exportOpen)}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            title="Export design (Ctrl+E)"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
          </button>

          {exportOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setExportOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
                <button
                  onClick={handleExportPng}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Export as PNG
                  <kbd className="ml-auto rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 font-mono text-[9px] text-zinc-500">
                    {"\u2318"}E
                  </kbd>
                </button>
                <button
                  onClick={handleExportSvg}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <FileCode2 className="h-3.5 w-3.5" />
                  Export as SVG
                </button>
                <button
                  onClick={handleExportJson}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <FileJson className="h-3.5 w-3.5" />
                  Export as JSON
                </button>
              </div>
            </>
          )}
        </div>

        <div className="hidden h-4 w-px bg-zinc-800 md:block" />

        <button
          onClick={onClearCanvas}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-rose-400 md:flex"
          title="Clear canvas"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        {/* Divider before the primary actions */}
        <div className="hidden h-4 w-px bg-zinc-800 md:block" />

        <button
          onClick={onToggleAI}
          className="flex h-7 items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 text-xs font-medium text-cyan-400 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/15 hover:text-cyan-300"
          title="AI assistant — bring your own API key"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI</span>
        </button>

        <Button
          size="sm"
          onClick={onSimulate}
          className="h-7 gap-1.5 bg-cyan-500 px-3 text-xs font-medium text-white hover:bg-cyan-400"
        >
          <Play className="h-3 w-3" />
          Simulate
        </Button>

        {/* Divider before utility controls */}
        <div className="hidden h-4 w-px bg-zinc-800 md:block" />

        <button
          onClick={toggleTheme}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 md:flex"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-label="Toggle color theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={onOpenShortcuts}
          className="hidden h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 md:flex"
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </button>

        <button
          onClick={onToggleRight}
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Toggle panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

/** Find the first node ID in the map whose key starts with the given componentId. */
