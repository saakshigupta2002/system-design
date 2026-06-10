"use client";

import { useEffect } from "react";
import { X, BookOpen, Lightbulb, AlertTriangle, Sparkles, Info } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { getProblemById } from "@/data/problems";
import { getEditorial, type EditorialCallout, type EditorialTable } from "@/data/editorials";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

const CALLOUT_STYLES: Record<
  EditorialCallout["kind"],
  { border: string; bg: string; icon: typeof Lightbulb; iconColor: string; label: string }
> = {
  tip: { border: "border-cyan-500/25", bg: "bg-cyan-500/[0.06]", icon: Lightbulb, iconColor: "text-cyan-400", label: "Tip" },
  warning: { border: "border-amber-500/25", bg: "bg-amber-500/[0.06]", icon: AlertTriangle, iconColor: "text-amber-400", label: "Common mistake" },
  analogy: { border: "border-violet-500/25", bg: "bg-violet-500/[0.06]", icon: Sparkles, iconColor: "text-violet-400", label: "In plain English" },
  note: { border: "border-zinc-700", bg: "bg-zinc-800/40", icon: Info, iconColor: "text-zinc-400", label: "Jargon" },
};

function Callout({ callout }: { callout: EditorialCallout }) {
  const s = CALLOUT_STYLES[callout.kind];
  const Icon = s.icon;
  return (
    <div className={`flex gap-2.5 rounded-lg border ${s.border} ${s.bg} px-3.5 py-3`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.iconColor}`} />
      <div>
        <p className={`mb-0.5 text-[11px] font-semibold uppercase tracking-wider ${s.iconColor} opacity-80`}>
          {s.label}
        </p>
        <p className="text-sm leading-7 text-zinc-300">{callout.text}</p>
      </div>
    </div>
  );
}

function ComparisonTable({ table }: { table: EditorialTable }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-zinc-900">
            {table.headers.map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold text-zinc-200">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-t border-zinc-800">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 align-top leading-relaxed ${j === 0 ? "font-medium text-zinc-200" : "text-zinc-400"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface EditorialDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EditorialDialog({ open, onClose }: EditorialDialogProps) {
  const selectedProblemId = useAppStore((s) => s.selectedProblemId);
  const problem = getProblemById(selectedProblemId);
  const editorial = getEditorial(selectedProblemId);
  const hasReference = (problem?.referenceSolution?.nodes.length ?? 0) > 0;

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

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
              <BookOpen className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-zinc-50">
                {problem ? problem.title : "Editorial"}
              </h2>
              <p className="text-xs text-zinc-500">Editorial · how to approach &amp; solve it</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-6">
            {/* Intuition */}
            {editorial && (
              <div className="mb-6 flex gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-3.5">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
                    Key idea
                  </p>
                  <p className="text-sm leading-7 text-zinc-200">{editorial.summary}</p>
                </div>
              </div>
            )}

            {/* Architecture diagram (shown whenever a reference exists) */}
            {hasReference && (
              <figure className="mb-7">
                <figcaption className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Reference architecture
                </figcaption>
                <ArchitectureDiagram problemId={selectedProblemId} notes={editorial?.componentNotes} />
                <p className="mt-2 text-xs text-zinc-500">
                  One valid design — open it on the canvas with the &ldquo;Reference&rdquo; button to
                  explore it.
                </p>
              </figure>
            )}

            {/* Authored sections */}
            {editorial ? (
              <div className="space-y-7">
                {editorial.sections.map((section, i) => (
                  <section key={i}>
                    <h3 className="mb-2.5 border-l-2 border-cyan-500/60 pl-2.5 text-[15px] font-semibold text-zinc-50">
                      {section.heading}
                    </h3>
                    <div className="space-y-3 pl-2.5">
                      {section.body?.map((p, j) => (
                        <p key={j} className="text-sm leading-7 text-zinc-300">
                          {p}
                        </p>
                      ))}
                      {section.bullets && (
                        <ul className="space-y-2">
                          {section.bullets.map((b, j) => (
                            <li key={j} className="flex gap-2.5 text-sm leading-7 text-zinc-300">
                              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500/70" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {section.table && <ComparisonTable table={section.table} />}
                      {section.code && (
                        <pre className="mt-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-zinc-300">
                          {section.code}
                        </pre>
                      )}
                      {section.callouts?.map((c, j) => (
                        <Callout key={j} callout={c} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
                  <BookOpen className="h-4 w-4 text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">Full write-up coming soon</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-zinc-500">
                    The step-by-step editorial for this problem hasn&apos;t been added yet
                    {hasReference ? " — but the reference architecture above shows one valid design." : "."}{" "}
                    Try the Hints in the Properties panel in the meantime.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
