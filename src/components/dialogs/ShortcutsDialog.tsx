"use client";

import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["⌘/Ctrl", "Enter"], action: "Run simulation" },
  { keys: ["⌘/Ctrl", "⇧", "S"], action: "Score the design" },
  { keys: ["⌘/Ctrl", "S"], action: "Save design" },
  { keys: ["⌘/Ctrl", "O"], action: "Load design" },
  { keys: ["⌘/Ctrl", "E"], action: "Export as PNG" },
  { keys: ["⌘/Ctrl", "Z"], action: "Undo" },
  { keys: ["⌘/Ctrl", "⇧", "Z"], action: "Redo" },
  { keys: ["⌘/Ctrl", "C"], action: "Copy selected component" },
  { keys: ["⌘/Ctrl", "V"], action: "Paste component" },
  { keys: ["⇧", "drag"], action: "Box-select multiple items" },
  { keys: ["Delete"], action: "Remove selected components or wires" },
  { keys: ["Esc"], action: "Close dialogs / deselect" },
  { keys: ["?"], action: "Show this cheatsheet" },
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="space-y-2.5">
          {SHORTCUTS.map((s) => (
            <li key={s.action} className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-zinc-300">{s.action}</span>
              <span className="flex shrink-0 items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
