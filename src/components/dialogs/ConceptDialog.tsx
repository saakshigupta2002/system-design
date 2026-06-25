"use client";

import { useEffect } from "react";
import { X, Check, Ban, Scale, Lightbulb, Boxes } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { getConceptByComponentId } from "@/data/conceptLibrary";
import { getComponentById } from "@/data/components";
import { roleOf } from "@/data/roles";

function roleLabel(r: string): string {
  return r.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Just-in-time concept viewer: "when to use / when not / trade-offs / interview
 *  tips" for a component or role. Opened from score feedback and missing-role
 *  chips so learners get the why exactly when it's flagged. */
export function ConceptDialog() {
  const focusedConceptId = useAppStore((s) => s.focusedConceptId);
  const closeConcept = useAppStore((s) => s.closeConcept);

  useEffect(() => {
    if (!focusedConceptId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeConcept(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedConceptId, closeConcept]);

  if (!focusedConceptId) return null;
  const concept = getConceptByComponentId(focusedConceptId);
  const title = getComponentById(focusedConceptId)?.label ?? roleLabel(roleOf(focusedConceptId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={closeConcept} />
      <div className="relative z-10 max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-lg">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          </div>
          <button onClick={closeConcept} className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!concept ? (
          <p className="text-xs text-zinc-500">No concept notes for this component yet.</p>
        ) : (
          <div className="space-y-4">
            <Section icon={<Check className="h-3.5 w-3.5 text-emerald-500" />} title="When to use" items={concept.whenToUse} />
            <Section icon={<Ban className="h-3.5 w-3.5 text-rose-500" />} title="When not to use" items={concept.whenNotToUse} />
            <Section icon={<Scale className="h-3.5 w-3.5 text-amber-500" />} title="Key trade-offs" items={concept.keyTradeoffs} />
            <Section icon={<Lightbulb className="h-3.5 w-3.5 text-cyan-400" />} title="Interview tips" items={concept.interviewTips} />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
      </div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="text-xs leading-relaxed text-zinc-300">• {t}</li>
        ))}
      </ul>
    </div>
  );
}
