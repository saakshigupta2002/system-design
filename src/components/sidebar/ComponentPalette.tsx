"use client";

import { type DragEvent, useCallback, useState } from "react";
import { useReactFlow, type Node } from "@xyflow/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SYSTEM_COMPONENTS,
  COMPONENT_CATEGORIES,
  getComponentById,
} from "@/data/components";
import { getConceptByComponentId } from "@/data/conceptLibrary";
import { Server, Plus, Pencil, Search as SearchIcon, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ICON_MAP } from "@/lib/icons";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import { useCustomComponentsStore } from "@/store/customComponentsStore";
import type { SystemComponent } from "@/types/component";

// Accent color per category — applied to the icon glyph only, matching how the
// canvas nodes are colored, so the palette and the canvas read as one design.
const CATEGORY_ACCENT: Record<string, string> = {
  client: "text-pink-400",
  networking: "text-blue-400",
  compute: "text-violet-400",
  storage: "text-amber-400",
  messaging: "text-emerald-400",
  infrastructure: "text-cyan-400",
  aws: "text-orange-400",
  gcp: "text-sky-400",
  ai: "text-fuchsia-400",
  saas: "text-teal-400",
};

interface ComponentPaletteProps {
  onCreateCustomComponent?: () => void;
  onEditCustomComponent?: (id: string) => void;
}

export function ComponentPalette({ onCreateCustomComponent, onEditCustomComponent }: ComponentPaletteProps = {}) {
  const [search, setSearch] = useState("");
  const { getViewport } = useReactFlow();
  const addNode = useCanvasStore((s) => s.addNode);
  const customComponents = useCustomComponentsStore((s) => s.components);
  const deleteCustomComponent = useCustomComponentsStore((s) => s.deleteComponent);

  const allComponents: SystemComponent[] = [...customComponents, ...SYSTEM_COMPONENTS];
  const customIds = new Set(customComponents.map((c) => c.id));

  function handleDragStart(e: DragEvent, componentId: string) {
    e.dataTransfer.setData("application/systemdesign-component", componentId);
    e.dataTransfer.effectAllowed = "copy";

    const ghost = document.createElement("div");
    ghost.style.cssText = "position:absolute;top:-1000px;left:-1000px;padding:6px 12px;background:var(--color-zinc-900);border:1px solid var(--color-zinc-700);border-radius:8px;color:var(--color-zinc-100);font-size:12px;font-family:system-ui;white-space:nowrap;";
    const comp = allComponents.find((c) => c.id === componentId);
    ghost.textContent = comp?.label ?? componentId;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  /** Tap-to-add: place the component at the canvas viewport center. */
  const handleQuickAdd = useCallback(
    (componentId: string) => {
      const component = getComponentById(componentId);
      if (!component) return;

      const { x, y, zoom } = getViewport();
      // Jitter the center so repeated taps don't stack exactly on top
      const jitter = () => (Math.random() - 0.5) * 60;
      const centerX = (-x + window.innerWidth / 2) / zoom + jitter();
      const centerY = (-y + window.innerHeight / 2) / zoom + jitter();

      const newNode: Node<ComponentNodeData> = {
        id: `${componentId}-${crypto.randomUUID()}`,
        type: "component",
        position: { x: centerX, y: centerY },
        data: {
          componentId: component.id,
          label: component.label,
          icon: component.icon,
          category: component.category,
          replicas: 1,
          maxQPS: component.maxQPS,
          latencyMs: component.latencyMs,
          scalable: component.scalable,
        },
      };
      addNode(newNode);
      useAppStore.getState().showToast(`Added ${component.label}`, "success");
    },
    [getViewport, addNode]
  );

  const query = search.toLowerCase().trim();

  const matches = (c: SystemComponent) =>
    query === "" ||
    c.label.toLowerCase().includes(query) ||
    c.description.toLowerCase().includes(query);

  const totalMatches = query
    ? allComponents.filter(matches).length
    : allComponents.length;

  const handleDeleteCustom = (e: React.MouseEvent, id: string, label: string) => {
    e.stopPropagation();
    e.preventDefault();
    deleteCustomComponent(id);
    useAppStore.getState().showToast(`Removed ${label}`, "info");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-3 pt-3 pb-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            aria-label="Search components"
            placeholder="Search components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none transition-colors focus:border-cyan-500"
          />
        </div>
        {query ? (
          <p className="mt-1.5 text-[11px] text-zinc-500">
            {totalMatches === 0
              ? "No matches"
              : `${totalMatches} component${totalMatches === 1 ? "" : "s"} match "${search}"`}
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] leading-tight text-zinc-600">
            <span className="text-zinc-500">qps</span> = max throughput per instance (illustrative)
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="space-y-4 p-3">
        {onCreateCustomComponent && (
          <button
            onClick={onCreateCustomComponent}
            className="flex w-full items-center gap-2 rounded-md border border-dashed border-zinc-600 px-2.5 py-2 text-left text-xs font-medium text-cyan-400 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/5"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            Create Custom Component
          </button>
        )}
        {COMPONENT_CATEGORIES.map((cat) => {
          const items = allComponents.filter(
            (c) => c.category === cat.key && matches(c),
          );
          if (query !== "" && items.length === 0) return null;
          return (
            <div key={cat.key}>
              <div className="mb-1.5 flex items-center justify-between px-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {cat.label}
                </p>
                <span className="text-[10px] tabular-nums text-zinc-600">{items.length}</span>
              </div>
              <TooltipProvider>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = ICON_MAP[item.icon] ?? Server;
                  const accent = CATEGORY_ACCENT[item.category] ?? "text-cyan-400";
                  const concept = getConceptByComponentId(item.id);
                  const tipText = (concept?.whenToUse[0] ?? item.description ?? "").trim();
                  const isCustom = customIds.has(item.id);
                  const card = (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onClick={() => handleQuickAdd(item.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(item.id); }}
                      title="Click to add to the canvas, or drag to place it"
                      className="group flex cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 transition-colors hover:border-zinc-700 hover:bg-zinc-800 active:cursor-grabbing"
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${accent}`} />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-300">
                        {item.label}
                      </span>
                      {isCustom && (
                        <Badge
                          variant="outline"
                          className="h-4 shrink-0 border-cyan-500/30 bg-cyan-500/10 px-1.5 text-[10px] font-medium text-cyan-400"
                        >
                          Custom
                        </Badge>
                      )}
                      <span
                        className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500"
                        title="Max throughput per instance (queries/sec, illustrative). Edit a placed component's QPS in the Inspect panel."
                      >
                        {item.maxQPS === Infinity ? "\u221e" : `${(item.maxQPS / 1000).toFixed(0)}k`}
                      </span>
                      {isCustom && onEditCustomComponent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCustomComponent(item.id);
                          }}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 opacity-0 transition-colors hover:text-cyan-400 group-hover:opacity-100"
                          title="Edit custom component (name, QPS, etc.)"
                          aria-label={`Edit ${item.label}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustom(e, item.id, item.label)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 opacity-0 transition-colors hover:text-rose-400 group-hover:opacity-100"
                          title="Delete custom component"
                          aria-label={`Delete ${item.label}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );

                  // Only wrap in a tooltip when there's text to show \u2014 otherwise
                  // an empty tooltip renders just its arrow (the stray white nub).
                  if (!tipText) return <div key={item.id}>{card}</div>;
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger render={card} />
                      <TooltipContent side="right" sideOffset={8} className="max-w-[220px]">
                        <p className="text-xs leading-relaxed">{tipText}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              </TooltipProvider>
            </div>
          );
        })}

        {/* Trademark / attribution notice — logos identify the technologies only */}
        <p className="px-0.5 pt-1 text-[10px] leading-relaxed text-zinc-600">
          Logos are trademarks of their respective owners, used for identification
          only — not affiliated with or endorsed by them. Icons via{" "}
          <a
            href="https://simpleicons.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-zinc-400"
          >
            Simple Icons
          </a>{" "}
          (CC0).
        </p>
      </div>
    </div>
    </div>
  );
}
