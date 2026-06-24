"use client";

import { useEffect, useState } from "react";
import { Boxes, Layers, X } from "lucide-react";
import { useModeStore, type SkillMode } from "@/store/modeStore";

/**
 * First-run picker for the practice mode. Shown once (until the user chooses);
 * the choice is persisted and can be changed anytime from the top bar.
 */
export function ModeSelectDialog() {
  const hasChosenMode = useModeStore((s) => s.hasChosenMode);
  const chooseMode = useModeStore((s) => s.chooseMode);
  // Only render after mount so the persisted choice has rehydrated — avoids a
  // flash of the modal for returning users and any hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!mounted || hasChosenMode) return null;

  const pick = (mode: SkillMode) => chooseMode(mode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
        <div className="mb-1 flex items-start justify-between">
          <h2 className="text-base font-semibold text-zinc-100">How do you want to practice?</h2>
          <button
            onClick={() => pick("beginner")}
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Close and start in Beginner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 text-xs leading-relaxed text-zinc-400">
          You can switch anytime from the top bar.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => pick("beginner")}
            className="group rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left transition-colors hover:border-cyan-500/50 hover:bg-zinc-800"
          >
            <Boxes className="mb-2 h-5 w-5 text-cyan-400" />
            <p className="text-sm font-semibold text-zinc-100">Beginner</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Learn the building blocks. Drag components onto the canvas, wire
              them up, simulate traffic, and get scored.
            </p>
          </button>

          <button
            onClick={() => pick("advanced")}
            className="group rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left transition-colors hover:border-cyan-500/50 hover:bg-zinc-800"
          >
            <Layers className="mb-2 h-5 w-5 text-purple-400" />
            <p className="text-sm font-semibold text-zinc-100">Advanced</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Everything in Beginner, plus the deep-dive layers interviews test:
              estimation, API &amp; data model, sharding, consistency, and a mock
              interviewer.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
