"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Pencil, Search as SearchIcon } from "lucide-react";
import { PROBLEMS } from "@/data/problems";
import { useAppStore } from "@/store/appStore";
import { useCustomProblemsStore } from "@/store/customProblemsStore";

const DIFFICULTY_FILTERS = ["All", "Easy", "Medium", "Hard"] as const;
type DifficultyFilter = (typeof DIFFICULTY_FILTERS)[number];

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "Easy":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "Medium":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "Hard":
      return "border-rose-500/30 bg-rose-500/10 text-rose-400";
    default:
      return "";
  }
}

interface ProblemSelectorProps {
  onCreateProblem?: () => void;
  onEditProblem?: (id: string) => void;
}

export function ProblemSelector({ onCreateProblem, onEditProblem }: ProblemSelectorProps) {
  const selectedProblemId = useAppStore((s) => s.selectedProblemId);
  const setSelectedProblem = useAppStore((s) => s.setSelectedProblem);
  const customProblems = useCustomProblemsStore((s) => s.problems);
  const deleteProblem = useCustomProblemsStore((s) => s.deleteProblem);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("All");

  const query = search.toLowerCase().trim();
  const matches = (p: { title: string; tags: string[]; difficulty: string }) =>
    (difficulty === "All" || p.difficulty === difficulty) &&
    (query === "" ||
      p.title.toLowerCase().includes(query) ||
      p.tags.some((t) => t.toLowerCase().includes(query)));

  const filteredCustom = customProblems.filter(matches);
  const filteredBuiltin = PROBLEMS.filter(matches);

  const handleDeleteCustom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteProblem(id);
    // If the deleted problem was selected, switch to the first predefined problem
    if (selectedProblemId === id) {
      setSelectedProblem(PROBLEMS[0].id);
    }
    useAppStore.getState().showToast("Custom problem deleted", "info");
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-3">
        <p className="px-0.5 pb-1 text-[11px] leading-tight text-zinc-500">
          Browse or search every problem — jump to any.
        </p>
        {/* Search + difficulty filter */}
        <div className="relative mb-1.5">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            aria-label="Search problems"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 py-2 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none transition-colors focus:border-cyan-500"
          />
        </div>
        <div className="!mb-2 flex gap-1">
          {DIFFICULTY_FILTERS.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                difficulty === d
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Create Problem button */}
        <button
          onClick={onCreateProblem}
          className="flex w-full items-center gap-2 rounded-md border border-dashed border-zinc-600 px-2.5 py-2 text-left text-xs font-medium text-violet-400 transition-colors hover:border-violet-500/50 hover:bg-violet-500/5"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Custom Problem
        </button>

        {/* Custom problems */}
        {filteredCustom.map((problem) => (
          <button
            key={problem.id}
            onClick={() => setSelectedProblem(problem.id)}
            aria-pressed={problem.id === selectedProblemId}
            className={`group flex w-full flex-col gap-1.5 rounded-md px-2.5 py-2 text-left transition-colors ${
              problem.id === selectedProblemId
                ? "border border-zinc-700 bg-zinc-800"
                : "border border-transparent hover:bg-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span
                className={`flex-1 truncate text-xs font-medium ${
                  problem.id === selectedProblemId
                    ? "text-cyan-500"
                    : "text-zinc-300"
                }`}
              >
                {problem.title}
              </span>
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className="h-4 shrink-0 border-violet-500/30 bg-violet-500/10 px-1.5 text-[11px] font-medium text-violet-400"
                >
                  Custom
                </Badge>
                <Badge
                  variant="outline"
                  className={`h-4 shrink-0 px-1.5 text-[11px] font-medium ${getDifficultyColor(
                    problem.difficulty
                  )}`}
                >
                  {problem.difficulty}
                </Badge>
                {onEditProblem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditProblem(problem.id);
                    }}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-zinc-500 opacity-0 transition-opacity hover:text-cyan-400 group-hover:opacity-100"
                    title="Edit custom problem"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={(e) => handleDeleteCustom(e, problem.id)}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-zinc-500 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                  title="Delete custom problem"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {problem.tags.map((tag, i) => (
                <span key={tag} className="text-[11px] text-zinc-400">
                  {tag}{i < problem.tags.length - 1 ? " ·" : ""}
                </span>
              ))}
            </div>
          </button>
        ))}

        {/* Separator if there are custom problems */}
        {filteredCustom.length > 0 && (
          <div className="!my-2 h-px bg-zinc-800" />
        )}

        {/* Predefined problems */}
        {filteredBuiltin.length === 0 && filteredCustom.length === 0 && (
          <p className="px-2.5 py-4 text-center text-xs text-zinc-500">
            No problems match{query ? ` "${search}"` : ""} — try a different search or filter.
          </p>
        )}
        {filteredBuiltin.map((problem) => (
          <button
            key={problem.id}
            onClick={() => setSelectedProblem(problem.id)}
            aria-pressed={problem.id === selectedProblemId}
            className={`flex w-full flex-col gap-1.5 rounded-md px-2.5 py-2 text-left transition-colors ${
              problem.id === selectedProblemId
                ? "border border-zinc-700 bg-zinc-800"
                : "border border-transparent hover:bg-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-medium ${
                  problem.id === selectedProblemId
                    ? "text-cyan-500"
                    : "text-zinc-300"
                }`}
              >
                {problem.title}
              </span>
              <Badge
                variant="outline"
                className={`h-4 px-1.5 text-[11px] font-medium ${getDifficultyColor(
                  problem.difficulty
                )}`}
              >
                {problem.difficulty}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {problem.tags.map((tag, i) => (
                <span key={tag} className="text-[11px] text-zinc-400">
                  {tag}{i < problem.tags.length - 1 ? " ·" : ""}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
