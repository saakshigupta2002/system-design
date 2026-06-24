"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronDown, ChevronRight, Check, Dumbbell } from "lucide-react";
import {
  DRILLS,
  DRILL_CATEGORIES,
  filterDrills,
  type Drill,
  type DrillCategory,
  type DrillDifficulty,
} from "@/data/drills";
import { useDrillProgressStore } from "@/store/drillProgressStore";

const DIFFICULTIES = ["all", "Easy", "Medium", "Hard"] as const;

function difficultyColor(d: string) {
  switch (d) {
    case "Easy": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "Medium": return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "Hard": return "border-rose-500/30 bg-rose-500/10 text-rose-400";
    default: return "";
  }
}

export function DrillLibrary() {
  const [difficulty, setDifficulty] = useState<DrillDifficulty | "all">("all");
  const [category, setCategory] = useState<DrillCategory | "all">("all");
  const [search, setSearch] = useState("");
  const known = useDrillProgressStore((s) => s.known);

  const drills = filterDrills({ difficulty, category, search });
  const knownInView = drills.filter((d) => known.includes(d.id)).length;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-zinc-800 p-2.5">
        <div className="flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5 text-cyan-500" />
          <p className="text-xs font-semibold text-zinc-200">Deep-Dive Drills</p>
          <span className="ml-auto text-[10px] text-zinc-500">
            {knownInView}/{drills.length} reviewed
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drills…"
            className="w-full rounded-md bg-zinc-800 py-1.5 pl-7 pr-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`flex-1 rounded px-1.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                difficulty === d ? "bg-zinc-700 text-zinc-100" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {d === "all" ? "All" : d}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1">
          <CategoryChip label="All" active={category === "all"} onClick={() => setCategory("all")} />
          {DRILL_CATEGORIES.map((c) => (
            <CategoryChip key={c.value} label={c.label} active={category === c.value} onClick={() => setCategory(c.value)} />
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1.5 p-2.5">
          {drills.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-600">No drills match these filters.</p>
          ) : (
            drills.map((drill) => <DrillCard key={drill.id} drill={drill} />)
          )}
          {DRILLS.length === 0 && (
            <p className="text-[11px] text-zinc-600">No drills available.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
        active ? "bg-cyan-500/15 text-cyan-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

function DrillCard({ drill }: { drill: Drill }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const known = useDrillProgressStore((s) => s.known.includes(drill.id));
  const toggleKnown = useDrillProgressStore((s) => s.toggleKnown);

  return (
    <div className={`rounded-md border bg-zinc-800/60 ${known ? "border-emerald-500/20" : "border-zinc-700"}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-1.5 px-2.5 py-2 text-left">
        {open ? <ChevronDown className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" /> : <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-snug text-zinc-200">{drill.question}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className={`rounded border px-1 py-0.5 text-[9px] font-medium ${difficultyColor(drill.difficulty)}`}>
              {drill.difficulty}
            </span>
            <span className="rounded bg-zinc-700/60 px-1 py-0.5 text-[9px] capitalize text-zinc-400">{drill.category}</span>
            <span className="text-[9px] text-zinc-600">{drill.problemTitle}</span>
          </div>
        </div>
        {known && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />}
      </button>

      {open && (
        <div className="space-y-2 border-t border-zinc-700/60 px-2.5 py-2">
          <p className="text-[11px] italic leading-relaxed text-zinc-500">Hint: {drill.hint}</p>
          {revealed ? (
            <p className="text-xs leading-relaxed text-zinc-300">{drill.answer}</p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700"
            >
              Reveal answer
            </button>
          )}
          <button
            onClick={() => toggleKnown(drill.id)}
            className={`flex w-full items-center justify-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              known
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {known ? "Reviewed — undo" : "Mark as reviewed"}
          </button>
        </div>
      )}
    </div>
  );
}
