"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComponentPalette } from "./ComponentPalette";
import { ProblemSelector } from "./ProblemSelector";
import { LearningPath } from "./LearningPath";
import { PanelResizeHandle } from "@/components/layout/PanelResizeHandle";
import { useAppStore } from "@/store/appStore";

interface SidebarProps {
  open?: boolean;
  onCreateProblem?: () => void;
  onEditProblem?: (id: string) => void;
  onCreateCustomComponent?: () => void;
  onEditCustomComponent?: (id: string) => void;
  onOpenEditorial?: () => void;
  variant?: "desktop" | "mobile";
}

type SidebarTabsProps = Omit<SidebarProps, "open" | "variant">;

function SidebarTabs({
  onCreateProblem,
  onEditProblem,
  onCreateCustomComponent,
  onEditCustomComponent,
  onOpenEditorial,
}: SidebarTabsProps) {
  const activeLeftTab = useAppStore((s) => s.activeLeftTab);
  const setActiveLeftTab = useAppStore((s) => s.setActiveLeftTab);
  return (
    <Tabs value={activeLeftTab} onValueChange={(v) => setActiveLeftTab(v as typeof activeLeftTab)} className="flex flex-1 flex-col min-h-0">
      <TabsList className="mx-2 mt-2 h-9 w-auto shrink-0 bg-zinc-800">
        <TabsTrigger
          value="components"
          className="h-7 px-3 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100"
        >
          Components
        </TabsTrigger>
        <TabsTrigger
          value="problems"
          className="h-7 px-3 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100"
        >
          Problems
        </TabsTrigger>
        <TabsTrigger
          value="learn"
          className="h-7 px-3 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100"
        >
          Learn
        </TabsTrigger>
      </TabsList>

      <TabsContent value="components" className="mt-0 flex-1 min-h-0 overflow-hidden">
        <ComponentPalette
          onCreateCustomComponent={onCreateCustomComponent}
          onEditCustomComponent={onEditCustomComponent}
        />
      </TabsContent>

      <TabsContent value="problems" className="mt-0 flex-1 min-h-0 overflow-hidden">
        <ProblemSelector onCreateProblem={onCreateProblem} onEditProblem={onEditProblem} />
      </TabsContent>

      <TabsContent value="learn" className="mt-0 flex-1 min-h-0 overflow-hidden">
        <LearningPath onOpenEditorial={onOpenEditorial} />
      </TabsContent>
    </Tabs>
  );
}

export function Sidebar({
  open = true,
  onCreateProblem,
  onEditProblem,
  onCreateCustomComponent,
  onEditCustomComponent,
  onOpenEditorial,
  variant = "desktop",
}: SidebarProps) {
  const width = useAppStore((s) => s.leftPanelWidth);
  const setWidth = useAppStore((s) => s.setLeftPanelWidth);
  const [resizing, setResizing] = useState(false);

  const tabsProps: SidebarTabsProps = {
    onCreateProblem,
    onEditProblem,
    onCreateCustomComponent,
    onEditCustomComponent,
    onOpenEditorial,
  };

  if (variant === "mobile") {
    return (
      <div className="flex h-full w-full flex-col bg-zinc-900">
        <SidebarTabs {...tabsProps} />
      </div>
    );
  }

  return (
    <aside
      className={`relative hidden shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 overflow-hidden md:flex ${
        resizing ? "" : "transition-all duration-200"
      } ${open ? "opacity-100" : "opacity-0 border-r-0"}`}
      style={{ width: open ? width : 0 }}
      aria-hidden={!open || undefined}
      inert={!open || undefined}
    >
      <div className="flex flex-1 flex-col min-h-0" style={{ width }}>
        <SidebarTabs {...tabsProps} />
      </div>
      {open && (
        <PanelResizeHandle side="left" onResize={setWidth} onDraggingChange={setResizing} />
      )}
    </aside>
  );
}
