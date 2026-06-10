"use client";

import { useEffect } from "react";
import { X, BookOpen, Lightbulb } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { getProblemById } from "@/data/problems";
import { getEditorial } from "@/data/editorials";

interface EditorialDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EditorialDialog({ open, onClose }: EditorialDialogProps) {
  const selectedProblemId = useAppStore((s) => s.selectedProblemId);
  const problem = getProblemById(selectedProblemId);
  const editorial = getEditorial(selectedProblemId);

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

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 shrink-0 text-cyan-400" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-zinc-100">
                Editorial{problem ? ` — ${problem.title}` : ""}
              </h2>
              <p className="text-[11px] text-zinc-500">How to approach &amp; solve this problem</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!editorial ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
                <BookOpen className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">Editorial coming soon</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500">
                  A full write-up for this problem hasn&apos;t been added yet. In the meantime, try
                  the Hints in the Properties panel and the Reference solution.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Intuition / summary */}
              <div className="flex gap-2.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3.5 py-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                <p className="text-[13px] leading-relaxed text-zinc-300">{editorial.summary}</p>
              </div>

              {editorial.sections.map((section, i) => (
                <section key={i} className="space-y-2">
                  <h3 className="text-[13px] font-semibold text-zinc-100">{section.heading}</h3>
                  {section.body?.map((p, j) => (
                    <p key={j} className="text-[13px] leading-relaxed text-zinc-400">
                      {p}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="space-y-1.5">
                      {section.bullets.map((b, j) => (
                        <li key={j} className="flex gap-2 text-[13px] leading-relaxed text-zinc-400">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.code && (
                    <pre className="overflow-x-auto rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 font-mono text-[11.5px] leading-relaxed text-zinc-300">
                      {section.code}
                    </pre>
                  )}
                </section>
              ))}

              <p className="border-t border-zinc-800 pt-3 text-[11px] text-zinc-600">
                Read this before you start to learn the method, or after to check your design against
                the reference.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
