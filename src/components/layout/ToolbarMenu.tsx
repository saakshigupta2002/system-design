"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

/** Lets a MenuItem close the menu it lives in after firing its action. */
const CloseMenuContext = createContext<() => void>(() => {});

interface ToolbarMenuProps {
  /** Content of the trigger button (icon, label, chevron). */
  trigger: ReactNode;
  /** Which edge the dropdown aligns to. */
  align?: "left" | "right";
  title?: string;
  children: ReactNode;
}

/**
 * A hand-rolled dropdown menu matching the toolbar's visual language.
 * Kept dependency-free (no Radix) to stay consistent with the existing
 * Export dropdown pattern. Closes on outside click and Escape.
 */
export function ToolbarMenu({ trigger, align = "left", title, children }: ToolbarMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        data-open={open}
        className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 data-[open=true]:bg-zinc-800 data-[open=true]:text-zinc-200"
      >
        {trigger}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            role="menu"
            className={`absolute top-full z-50 mt-1 max-h-[calc(100vh-4rem)] w-56 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-lg ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <CloseMenuContext.Provider value={close}>{children}</CloseMenuContext.Provider>
          </div>
        </>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  shortcut?: string;
  children: ReactNode;
}

export function MenuItem({ icon, onClick, danger, shortcut, children }: MenuItemProps) {
  const close = useContext(CloseMenuContext);
  return (
    <button
      role="menuitem"
      onClick={() => {
        onClick();
        close();
      }}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-800 ${
        danger ? "text-rose-400" : "text-zinc-300"
      }`}
    >
      {icon && <span className="text-zinc-500">{icon}</span>}
      <span>{children}</span>
      {shortcut && (
        <kbd className="ml-auto rounded border border-zinc-700 bg-zinc-800 px-1 py-0.5 font-mono text-[9px] text-zinc-500">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-zinc-800" />;
}
