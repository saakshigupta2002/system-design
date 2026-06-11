"use client";

import { useCallback, useRef } from "react";

interface PanelResizeHandleProps {
  /** Which panel this handle resizes — determines which screen edge the
   *  width is measured from. */
  side: "left" | "right";
  onResize: (width: number) => void;
  /** Notifies the panel so it can suspend its open/close transition while
   *  dragging (otherwise the animation fights the drag). */
  onDraggingChange?: (dragging: boolean) => void;
}

/** Thin draggable strip on a panel's inner edge for resizing it. */
export function PanelResizeHandle({ side, onResize, onDraggingChange }: PanelResizeHandleProps) {
  const dragging = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragging.current = true;
      onDraggingChange?.(true);
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const handleMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const width = side === "left" ? ev.clientX : window.innerWidth - ev.clientX;
        onResize(width);
      };
      const handleUp = (ev: PointerEvent) => {
        dragging.current = false;
        onDraggingChange?.(false);
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          // already released
        }
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [side, onResize, onDraggingChange]
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Drag to resize"
      onPointerDown={handlePointerDown}
      className={`absolute inset-y-0 z-20 hidden w-1.5 cursor-col-resize transition-colors hover:bg-cyan-500/40 active:bg-cyan-500/60 md:block ${
        side === "left" ? "right-0" : "left-0"
      }`}
    />
  );
}
