"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useTourStore } from "@/store/tourStore";
import { useAppStore } from "@/store/appStore";
import { TOUR_STEPS, type TourStep } from "@/data/tourSteps";

const CARD_W = 320;
const CARD_EST_H = 210;
const PAD = 6; // spotlight padding around the target
const GAP = 14; // gap between target and card

/** Make sure the UI region a step points at is actually visible before we
 *  try to measure it (open the sidebar on the right tab, or the right panel). */
function prepareForStep(step: TourStep) {
  const app = useAppStore.getState();
  if (step.sidebarTab) {
    app.setLeftSidebarOpen(true);
    app.setActiveLeftTab(step.sidebarTab);
  } else if (step.target === "sidebar") {
    app.setLeftSidebarOpen(true);
  }
  if (step.target === "right-panel" && !app.rightPanelOpen) app.toggleRightPanel();
}

function measure(target: string | null): DOMRect | null {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  // A hidden element (e.g. desktop sidebar on mobile) reports a zero box —
  // treat it as "no anchor" so the card falls back to centered.
  if (rect.width < 4 || rect.height < 4) return null;
  return rect;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Fixed-position style for the tour card, given the target rect + placement. */
function cardStyle(rect: DOMRect | null, placement: TourStep["placement"]): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect || placement === "center") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  switch (placement) {
    case "right":
      return {
        top: clamp(rect.top, 8, vh - CARD_EST_H - 8),
        left: clamp(rect.right + GAP, 8, vw - CARD_W - 8),
      };
    case "left":
      return {
        top: clamp(rect.top, 8, vh - CARD_EST_H - 8),
        left: clamp(rect.left - GAP - CARD_W, 8, vw - CARD_W - 8),
      };
    case "top":
      return {
        top: clamp(rect.top - GAP - CARD_EST_H, 8, vh - CARD_EST_H - 8),
        left: clamp(rect.left, 8, vw - CARD_W - 8),
      };
    case "bottom":
    default: {
      // Flip above if there isn't room below.
      const below = rect.bottom + GAP;
      const top = below + CARD_EST_H > vh ? rect.top - GAP - CARD_EST_H : below;
      return {
        top: clamp(top, 8, vh - CARD_EST_H - 8),
        left: clamp(rect.left, 8, vw - CARD_W - 8),
      };
    }
  }
}

export function ProductTour() {
  const active = useTourStore((s) => s.active);
  const step = useTourStore((s) => s.step);
  const next = useTourStore((s) => s.next);
  const prev = useTourStore((s) => s.prev);
  const stop = useTourStore((s) => s.stop);
  const goTo = useTourStore((s) => s.goTo);

  const [rect, setRect] = useState<DOMRect | null>(null);
  const current = TOUR_STEPS[step];

  const remeasure = useCallback(() => {
    if (!current) return;
    setRect(measure(current.target));
  }, [current]);

  // On each step: reveal the relevant region, then measure (with a couple of
  // retries so panels that animate open settle before we read their box).
  useLayoutEffect(() => {
    if (!active || !current) return;
    prepareForStep(current);
    // Measure off the render (rAF, then a couple of retries) so panels that
    // animate open have settled before we read their box.
    const raf = requestAnimationFrame(remeasure);
    const t1 = setTimeout(remeasure, 80);
    const t2 = setTimeout(remeasure, 280);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, step, current, remeasure]);

  // Keep the spotlight glued to the target as the window changes.
  useEffect(() => {
    if (!active) return;
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [active, remeasure]);

  // Keyboard: ← → to move, Esc to skip.
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); stop(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, stop]);

  if (!active || !current) return null;

  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dim + spotlight. When we have a target, a huge box-shadow on the hole
          dims everything else; otherwise a flat scrim covers the screen. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-cyan-400/70 transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(9, 9, 11, 0.72)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-zinc-950/72" />
      )}

      {/* Click-catcher so the page underneath isn't interactive mid-tour. */}
      <div className="fixed inset-0" onClick={() => {}} />

      {/* The step card */}
      <div
        className="fixed w-[320px] max-w-[calc(100vw-16px)] rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl"
        style={cardStyle(rect, current.placement)}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-100">{current.title}</h3>
          <button
            onClick={stop}
            className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">{current.body}</p>

        {/* Progress dots */}
        <div className="mt-4 flex items-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to step ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-4 bg-cyan-400" : "w-1.5 bg-zinc-700 hover:bg-zinc-600"
              }`}
            />
          ))}
          <span className="ml-auto text-[10px] tabular-nums text-zinc-500">
            {step + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* Controls */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={stop}
            className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Skip
          </button>
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <button
                onClick={prev}
                className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-400"
            >
              {isLast ? (
                <>
                  Done <Check className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
