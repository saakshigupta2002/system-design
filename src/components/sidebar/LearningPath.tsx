"use client";

import { useState, useCallback, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, ChevronRight, Star, Search, Target, RotateCcw, Dumbbell } from "lucide-react";
import { LEARNING_PATH, PROBLEM_CONCEPTS } from "@/data/learningPath";
import { PROBLEMS } from "@/data/problems";
import { useAppStore } from "@/store/appStore";
import { useScoreHistoryStore } from "@/store/scoreHistoryStore";
import { computeFocusArea, recommendRetry } from "@/lib/recommend";
import {
  COMPLETED_CHANGED_EVENT,
  readCompleted,
  writeCompleted,
} from "@/lib/learningProgress";

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

const TIER_COLORS: Record<string, string> = {
  Foundations: "text-emerald-400",
  Intermediate: "text-amber-400",
  Advanced: "text-rose-400",
  Expert: "text-purple-400",
};

const TIER_BAR_COLORS: Record<string, string> = {
  Foundations: "bg-emerald-500",
  Intermediate: "bg-amber-500",
  Advanced: "bg-rose-500",
  Expert: "bg-purple-500",
};

function getConceptsForProblem(problemId: string): string[] {
  return PROBLEM_CONCEPTS.find((p) => p.problemId === problemId)?.concepts ?? [];
}

export function LearningPath({
  onOpenEditorial,
  onOpenSpotFlaw,
}: { onOpenEditorial?: () => void; onOpenSpotFlaw?: () => void } = {}) {
  const selectedProblemId = useAppStore((s) => s.selectedProblemId);
  const setSelectedProblem = useAppStore((s) => s.setSelectedProblem);
  const setActiveLeftTab = useAppStore((s) => s.setActiveLeftTab);
  const historyEntries = useScoreHistoryStore((s) => s.entries);
  const focus = computeFocusArea(historyEntries);
  const retry = recommendRetry(historyEntries);
  const retryProblem = retry ? PROBLEMS.find((p) => p.id === retry.problemId) : undefined;
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(["Foundations"]));
  const [completed, setCompleted] = useState<Set<string>>(() => readCompleted());

  // Stay in sync when something else (e.g. a 71+ score) marks a problem done.
  useEffect(() => {
    const refresh = () => setCompleted(readCompleted());
    window.addEventListener(COMPLETED_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(COMPLETED_CHANGED_EVENT, refresh);
  }, []);

  const toggleCompleted = useCallback((problemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      writeCompleted(next);
      return next;
    });
  }, []);

  const toggleTier = (name: string) => {
    setExpandedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Find recommended next problem: first incomplete problem in earliest incomplete tier
  let recommendedId: string | null = null;
  for (const tier of LEARNING_PATH) {
    for (const pid of tier.problemIds) {
      if (!completed.has(pid)) {
        recommendedId = pid;
        break;
      }
    }
    if (recommendedId) break;
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-3">
        <p className="px-0.5 pb-1 text-[11px] leading-tight text-zinc-500">
          A guided path — follow the recommended order and track your progress.
        </p>

        {/* Adaptive focus area, from your scoring history */}
        {(focus || retryProblem) && (
          <div className="mb-1.5 space-y-2 rounded-lg border border-purple-500/20 bg-purple-500/[0.06] px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-zinc-200">Your focus area</span>
            </div>
            {focus && (
              <div className="space-y-1.5">
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Weakest dimension:{" "}
                  <span className="font-medium text-zinc-200">{focus.category}</span>{" "}
                  <span className="text-zinc-500">({Math.round(focus.avgPct * 100)}% avg)</span>. {focus.tip}
                </p>
                {focus.drillCategory && (
                  <button
                    onClick={() => setActiveLeftTab("drills")}
                    className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700"
                  >
                    <Dumbbell className="h-3 w-3" /> Practice {focus.category} drills
                  </button>
                )}
              </div>
            )}
            {retryProblem && (
              <button
                onClick={() => setSelectedProblem(retryProblem.id)}
                className="flex w-full items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-left text-[11px] text-zinc-300 hover:bg-zinc-700"
              >
                <RotateCcw className="h-3 w-3 shrink-0 text-zinc-500" />
                Retry <span className="font-medium text-zinc-200">{retryProblem.title}</span>
                <span className="ml-auto text-zinc-500">best {retry!.total}</span>
              </button>
            )}
          </div>
        )}

        {/* Concept practice */}
        {onOpenSpotFlaw && (
          <button
            onClick={onOpenSpotFlaw}
            className="mb-1.5 flex w-full items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-left transition-colors hover:border-amber-500/40 hover:bg-amber-500/10"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15">
              <Search className="h-3.5 w-3.5 text-amber-400" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-zinc-200">Concept Practice</span>
              <span className="block text-[10px] leading-tight text-zinc-500">
                Study a topic, then test yourself — 100+ questions
              </span>
            </span>
          </button>
        )}
        {LEARNING_PATH.map((tier) => {
          const isExpanded = expandedTiers.has(tier.name);
          const completedCount = tier.problemIds.filter((id) => completed.has(id)).length;
          const totalCount = tier.problemIds.length;
          const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

          return (
            <div key={tier.name}>
              {/* Tier header */}
              <button
                onClick={() => toggleTier(tier.name)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-zinc-800"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${TIER_COLORS[tier.name] ?? "text-zinc-300"}`}>
                      {tier.name}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{tier.description}</p>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1 w-full rounded-full bg-zinc-700">
                    <div
                      className={`h-1 rounded-full transition-all ${TIER_BAR_COLORS[tier.name] ?? "bg-cyan-500"}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* Problems in tier */}
              {isExpanded && (
                <div className="ml-3 mt-1 space-y-0.5">
                  {tier.problemIds.map((pid) => {
                    const problem = PROBLEMS.find((p) => p.id === pid);
                    if (!problem) return null;
                    const concepts = getConceptsForProblem(pid);
                    const isCompleted = completed.has(pid);
                    const isRecommended = pid === recommendedId;
                    const isSelected = pid === selectedProblemId;

                    return (
                      <div
                        key={pid}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedProblem(pid)}
                        onKeyDown={(e) => { if (e.key === "Enter") setSelectedProblem(pid); }}
                        className={`flex w-full cursor-pointer flex-col gap-1 rounded-md px-2.5 py-2 text-left transition-colors ${
                          isSelected
                            ? "border border-zinc-700 bg-zinc-800"
                            : isRecommended
                              ? "border border-cyan-800/50 bg-cyan-900/10 hover:bg-cyan-900/20"
                              : "border border-transparent hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {/* Completion toggle */}
                            <button
                              onClick={(e) => toggleCompleted(pid, e)}
                              className={`h-3.5 w-3.5 shrink-0 rounded border transition-colors ${
                                isCompleted
                                  ? "border-cyan-500 bg-cyan-500"
                                  : "border-zinc-600 hover:border-zinc-400"
                              }`}
                            >
                              {isCompleted && (
                                <svg viewBox="0 0 14 14" className="h-full w-full text-zinc-900">
                                  <path
                                    d="M3 7l3 3 5-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                            <span
                              className={`text-xs font-medium truncate ${
                                isCompleted
                                  ? "text-zinc-500 line-through"
                                  : isSelected
                                    ? "text-cyan-500"
                                    : "text-zinc-300"
                              }`}
                            >
                              {problem.title}
                            </span>
                            {isRecommended && !isCompleted && (
                              <Star className="h-3 w-3 shrink-0 text-amber-400 fill-amber-400" />
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {onOpenEditorial && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProblem(pid);
                                  onOpenEditorial();
                                }}
                                className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-cyan-400"
                                title="Read the editorial — how to approach & solve it"
                                aria-label={`Read editorial for ${problem.title}`}
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <Badge
                              variant="outline"
                              className={`h-4 px-1.5 text-[10px] font-medium ${getDifficultyColor(problem.difficulty)}`}
                            >
                              {problem.difficulty}
                            </Badge>
                          </div>
                        </div>
                        {concepts.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-5">
                            {concepts.map((c) => (
                              <span
                                key={c}
                                className="rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-500"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
