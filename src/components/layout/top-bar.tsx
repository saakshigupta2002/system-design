"use client";

import { useCallback, useEffect } from "react";
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
  Keyboard,
  LayoutGrid,
  Sparkles,
  Sun,
  Moon,
  Share2,
  Compass,
} from "lucide-react";
import { useTourStore } from "@/store/tourStore";
import { useAppStore } from "@/store/appStore";
import { useModeStore } from "@/store/modeStore";
import { useCanvasStore } from "@/store/canvasStore";
import { usePenStore } from "@/store/penStore";
import { PROBLEMS } from "@/data/problems";
import { useCustomProblemsStore } from "@/store/customProblemsStore";
import { type Node, useReactFlow } from "@xyflow/react";
import { exportAsPng, exportAsSvg, exportAsJSON } from "@/lib/exportCanvas";
import { createShareLink } from "@/lib/shareDesign";
import { ToolbarMenu, MenuItem, MenuSeparator } from "./ToolbarMenu";

interface TopBarProps {
  onSimulate: () => void;
  onClearCanvas: () => void;
  onLoadReference: () => void;
  onSave: () => void;
  onLoad: () => void;
  onStartInterview: () => void;
  onOpenMockInterview: () => void;
  onOpenShortcuts: () => void;
  onToggleAI: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

export function TopBar({ onSimulate, onLoadReference, onClearCanvas, onSave, onLoad, onStartInterview, onOpenMockInterview, onOpenShortcuts, onToggleAI, onToggleLeft, onToggleRight }: TopBarProps) {
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
  const skillMode = useModeStore((s) => s.skillMode);
  const chooseMode = useModeStore((s) => s.chooseMode);
  const startTour = useTourStore((s) => s.start);

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
    const name = currentProblem?.title ?? "design";
    try {
      await exportAsPng(name);
      useAppStore.getState().showToast("Exported as PNG", "success");
    } catch {
      useAppStore.getState().showToast("Export failed", "error");
    }
  }, [currentProblem]);

  const handleExportSvg = useCallback(async () => {
    const name = currentProblem?.title ?? "design";
    try {
      await exportAsSvg(name);
      useAppStore.getState().showToast("Exported as SVG", "success");
    } catch {
      useAppStore.getState().showToast("Export failed", "error");
    }
  }, [currentProblem]);

  const handleExportJson = useCallback(() => {
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

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-2 md:gap-3 md:px-3">
      {/* ── Left: identity, mode, grouped menus ─────────────────────────── */}
      <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
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
          <span className="hidden rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500 lg:inline">beta</span>
        </div>

        {/* Tour — always available, replays the product walkthrough */}
        <button
          data-tour="tour-button"
          onClick={startTour}
          className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-zinc-700/70 px-2 text-xs text-zinc-400 transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300"
          title="Take the product tour"
        >
          <Compass className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Tour</span>
        </button>

        {/* Beginner / Advanced mode switch */}
        <div className="mx-1 hidden h-4 w-px bg-zinc-800 sm:block" />
        <div className="hidden shrink-0 items-center rounded-md bg-zinc-800 p-0.5 sm:flex" title="Switch practice mode">
          {(["beginner", "advanced"] as const).map((m) => (
            <button
              key={m}
              onClick={() => chooseMode(m)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium capitalize transition-colors ${
                skillMode === m
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mx-1 hidden h-4 w-px bg-zinc-800 sm:block" />

        {/* File menu — persistence, sharing, export */}
        <ToolbarMenu
          dataTour="topbar-file"
          title="Save, load, share and export"
          trigger={
            <>
              <Save className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">File</span>
              <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
            </>
          }
        >
          <MenuItem icon={<Save className="h-3.5 w-3.5" />} onClick={onSave} shortcut="⌘S">
            Save design
          </MenuItem>
          <MenuItem icon={<FolderOpen className="h-3.5 w-3.5" />} onClick={onLoad} shortcut="⌘O">
            Load design
          </MenuItem>
          <MenuItem icon={<Share2 className="h-3.5 w-3.5" />} onClick={shareDesign}>
            Share link
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<ImageIcon className="h-3.5 w-3.5" />} onClick={handleExportPng} shortcut="⌘E">
            Export as PNG
          </MenuItem>
          <MenuItem icon={<FileCode2 className="h-3.5 w-3.5" />} onClick={handleExportSvg}>
            Export as SVG
          </MenuItem>
          <MenuItem icon={<FileJson className="h-3.5 w-3.5" />} onClick={handleExportJson}>
            Export as JSON
          </MenuItem>
        </ToolbarMenu>

        {/* Canvas menu — building and arranging the diagram */}
        <ToolbarMenu
          dataTour="topbar-canvas"
          title="Reference, notes, layout and clearing"
          trigger={
            <>
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Canvas</span>
              <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
            </>
          }
        >
          <MenuItem icon={<Download className="h-3.5 w-3.5" />} onClick={onLoadReference}>
            Load reference solution
          </MenuItem>
          <MenuItem icon={<StickyNote className="h-3.5 w-3.5" />} onClick={addTextNote}>
            Add text note
          </MenuItem>
          <MenuItem icon={<LayoutGrid className="h-3.5 w-3.5" />} onClick={tidyUp}>
            Tidy up layout
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Trash2 className="h-3.5 w-3.5" />} onClick={onClearCanvas} danger>
            Clear canvas
          </MenuItem>
        </ToolbarMenu>
      </div>

      {/* ── Right: primary actions + utilities ──────────────────────────── */}
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        {/* Interview menu — practice and mock */}
        <ToolbarMenu
          dataTour="interview"
          align="right"
          title="Interview practice"
          trigger={
            <>
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Interview</span>
              <ChevronDown className="h-2.5 w-2.5 text-zinc-500" />
            </>
          }
        >
          <MenuItem icon={<GraduationCap className="h-3.5 w-3.5" />} onClick={onStartInterview}>
            Practice interview
          </MenuItem>
          <MenuItem icon={<GraduationCap className="h-3.5 w-3.5" />} onClick={onOpenMockInterview}>
            Mock interview
          </MenuItem>
        </ToolbarMenu>

        <button
          data-tour="ai"
          onClick={onToggleAI}
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 text-xs font-medium text-cyan-400 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/15 hover:text-cyan-300"
          title="AI assistant — bring your own API key"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI</span>
        </button>

        <Button
          size="sm"
          data-tour="simulate"
          onClick={onSimulate}
          className="h-7 shrink-0 gap-1.5 bg-cyan-500 px-3 text-xs font-medium text-white hover:bg-cyan-400"
        >
          <Play className="h-3 w-3" />
          <span className="hidden sm:inline">Simulate</span>
        </Button>

        <div className="hidden h-4 w-px bg-zinc-800 sm:block" />

        <button
          onClick={toggleTheme}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 sm:flex"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          aria-label="Toggle color theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          onClick={onOpenShortcuts}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 lg:flex"
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <Keyboard className="h-4 w-4" />
        </button>

        <button
          onClick={onToggleRight}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          title="Toggle panel"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
