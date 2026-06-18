"use client";

import { X } from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";

export function CanvasTabBar() {
  const tabs = useCanvasStore((s) => s.tabs);
  const activeTabId = useCanvasStore((s) => s.activeTabId);
  const switchTab = useCanvasStore((s) => s.switchTab);
  const closeTab = useCanvasStore((s) => s.closeTab);

  // Don't render if only 1 tab (default "My Design")
  if (tabs.length <= 1) return null;

  return (
    <div className="flex h-8 w-full min-w-0 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => switchTab(tab.id)}
          title={tab.label}
          className={`group flex h-6 min-w-[84px] max-w-[180px] flex-1 basis-0 items-center gap-1 rounded-md px-2 text-[11px] transition-colors ${
            tab.id === activeTabId
              ? "bg-zinc-800 text-zinc-100"
              : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
          }`}
        >
          <span className="min-w-0 flex-1 truncate text-left">{tab.label}</span>
          {tab.readOnly && (
            <span className="shrink-0 rounded bg-cyan-500/10 px-1 py-0.5 text-[8px] font-medium text-cyan-400">
              REF
            </span>
          )}
          {tab.id !== "my-design" && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-zinc-700 group-hover:opacity-100"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
