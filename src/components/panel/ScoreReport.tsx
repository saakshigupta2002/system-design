"use client";

import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Trophy } from "lucide-react";
import { useState } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { useScoreHistoryStore } from "@/store/scoreHistoryStore";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore } from "@/store/canvasStore";
import { getProblemById } from "@/data/problems";
import { getComponentById } from "@/data/components";
import type { CategoryScore } from "@/types/scoring";

/** Compares the current design's components against the problem's reference
 *  solution and lists what's missing, extra, and matched. */
function ReferenceComparison() {
  const problemId = useAppStore((s) => s.selectedProblemId);
  const nodes = useCanvasStore((s) => s.nodes);
  const ref = getProblemById(problemId)?.referenceSolution;
  if (!ref || ref.nodes.length === 0) return null; // custom problems have none

  const refIds = new Set(ref.nodes.map((n) => n.componentId));
  const userIds = new Set(
    nodes
      .filter((n) => n.type !== "text")
      .map((n) => (n.data as { componentId?: string }).componentId)
      .filter((id): id is string => !!id)
  );
  const missing = [...refIds].filter((id) => !userIds.has(id));
  const extra = [...userIds].filter((id) => !refIds.has(id));
  const matched = [...refIds].filter((id) => userIds.has(id));
  const label = (id: string) => getComponentById(id)?.label ?? id;

  function Chips({ ids, className }: { ids: string[]; className: string }) {
    return (
      <div className="flex flex-wrap gap-1">
        {ids.map((id) => (
          <span key={id} className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${className}`}>
            {label(id)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <>
      <Separator className="bg-zinc-800" />
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Compared to reference
        </p>
        {missing.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-zinc-400">
              Missing — the reference uses these:
            </p>
            <Chips ids={missing} className="border border-amber-500/30 bg-amber-500/10 text-amber-400" />
          </div>
        )}
        {extra.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-zinc-400">
              Extra — not in the reference (make sure they&apos;re justified):
            </p>
            <Chips ids={extra} className="border border-zinc-700 bg-zinc-800 text-zinc-300" />
          </div>
        )}
        {matched.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] text-zinc-400">In both:</p>
            <Chips ids={matched} className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400" />
          </div>
        )}
        <p className="text-[11px] leading-relaxed text-zinc-600">
          One valid reference design — not the only correct answer. Open it with the
          &ldquo;Reference&rdquo; button to compare layouts.
        </p>
      </div>
    </>
  );
}

function ScoreHistory() {
  const entries = useScoreHistoryStore((s) => s.entries);
  const problemId = useAppStore((s) => s.selectedProblemId);
  const recent = entries.filter((e) => e.problemId === problemId).slice(-6).reverse();
  if (recent.length < 2) return null;

  return (
    <>
      <Separator className="bg-zinc-800" />
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Attempts on this problem
        </p>
        <div className="space-y-1">
          {recent.map((e, i) => {
            const prev = recent[i + 1];
            const delta = prev ? e.total - prev.total : null;
            return (
              <div
                key={e.timestamp}
                className="flex items-center justify-between rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs"
              >
                <span className="text-zinc-400">
                  {new Date(e.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {new Date(e.timestamp).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-2">
                  {delta !== null && delta !== 0 && (
                    <span className={delta > 0 ? "text-emerald-400" : "text-rose-400"}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                  <span className="font-mono font-semibold text-zinc-200">{e.total}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function CategorySection({ category }: { category: CategoryScore }) {
  const [expanded, setExpanded] = useState(false);
  const pct = (category.score / category.maxScore) * 100;

  const barColor =
    pct >= 80 ? "bg-emerald-500" :
    pct >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="rounded-md bg-zinc-800 px-3 py-2.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-zinc-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-zinc-400" />
          )}
          <span className="text-xs font-medium text-zinc-300">
            {category.category}
          </span>
        </div>
        <span className="font-mono text-xs text-zinc-400">
          {category.score}/{category.maxScore}
        </span>
      </button>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-700">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {category.passed.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="text-[13px] leading-relaxed text-zinc-300">{item}</span>
            </div>
          ))}
          {category.feedback.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="text-[13px] leading-relaxed text-zinc-300">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const VERDICT_BORDER: Record<string, string> = {
  "text-emerald-400": "border-emerald-400/30",
  "text-cyan-400": "border-cyan-400/30",
  "text-blue-400": "border-blue-400/30",
  "text-amber-400": "border-amber-400/30",
  "text-rose-400": "border-rose-400/30",
  "text-zinc-500": "border-zinc-500/30",
};

const VERDICT_BG: Record<string, string> = {
  "text-emerald-400": "bg-emerald-400/5",
  "text-cyan-400": "bg-cyan-400/5",
  "text-blue-400": "bg-blue-400/5",
  "text-amber-400": "bg-amber-400/5",
  "text-rose-400": "bg-rose-400/5",
  "text-zinc-500": "bg-zinc-500/5",
};

// Ring stroke keyed by the same verdict color as the badge, so they always agree.
const VERDICT_STROKE: Record<string, string> = {
  "text-emerald-400": "#34d399",
  "text-cyan-400": "#22d3ee",
  "text-blue-400": "#60a5fa",
  "text-amber-400": "#f59e0b",
  "text-rose-400": "#fb7185",
  "text-zinc-500": "#71717a",
};

function verdictBorderClass(verdictColor: string): string {
  return VERDICT_BORDER[verdictColor] ?? "border-zinc-500/30";
}

function verdictBgClass(verdictColor: string): string {
  return VERDICT_BG[verdictColor] ?? "bg-zinc-500/5";
}

export function ScoreReport() {
  const scoreResult = useSimulationStore((s) => s.scoreResult);

  if (!scoreResult) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
          <Trophy className="h-4 w-4 text-zinc-500" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-300">Ready to evaluate</p>
          <p className="mt-1 max-w-[220px] text-xs text-zinc-500">
            Design your system on the canvas, then click <span className="text-cyan-500">Score</span> to see how you did
          </p>
        </div>
      </div>
    );
  }

  const topImprovements = scoreResult.categories
    .flatMap((c) => c.feedback)
    .slice(0, 3);

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Overall score */}
        <div className="flex flex-col items-center gap-2 py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative flex items-center justify-center"
          >
            {(() => {
              const radius = 38;
              const circumference = 2 * Math.PI * radius;
              const progress = (scoreResult.total / 100) * circumference;
              const strokeColor = VERDICT_STROKE[scoreResult.verdictColor] ?? "#22d3ee";
              return (
                <svg width="96" height="96" className="-rotate-90">
                  <circle cx="48" cy="48" r={radius} fill="none" stroke="rgb(39,39,42)" strokeWidth="6" />
                  <motion.circle
                    cx="48" cy="48" r={radius} fill="none"
                    stroke={strokeColor} strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - progress }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
              );
            })()}
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-3xl font-bold text-zinc-100">
                {scoreResult.total}
              </span>
              <span className="text-xs text-zinc-400">/ 100</span>
            </div>
          </motion.div>

          <Badge
            variant="outline"
            className={`${scoreResult.verdictColor} ${verdictBorderClass(scoreResult.verdictColor)} ${verdictBgClass(scoreResult.verdictColor)} px-3 py-0.5 text-xs font-semibold`}
          >
            {scoreResult.verdict}
          </Badge>

          <p className="text-center text-xs text-zinc-500">
            {scoreResult.summary}
          </p>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Category breakdowns */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Categories
          </p>
          {scoreResult.categories.map((cat) => (
            <CategorySection key={cat.category} category={cat} />
          ))}
        </div>

        <ReferenceComparison />

        {/* Top improvements */}
        {topImprovements.length > 0 && (
          <>
            <Separator className="bg-zinc-800" />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Top Improvements
              </p>
              {topImprovements.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-md bg-zinc-800 border border-zinc-700 px-2.5 py-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-zinc-300">
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-relaxed text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <ScoreHistory />
      </div>
    </ScrollArea>
  );
}
