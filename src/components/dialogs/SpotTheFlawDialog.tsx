"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X, CheckCircle2, XCircle, ChevronRight, Award, RotateCcw } from "lucide-react";
import { ComponentDiagram } from "./ArchitectureDiagram";
import { SPOT_THE_FLAW, type FlawChallenge } from "@/data/spotTheFlaw";

const BEST_KEY = "spot-the-flaw-best";

/** Fisher–Yates shuffle returning a new array. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface SpotTheFlawDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SpotTheFlawDialog({ open, onClose }: SpotTheFlawDialogProps) {
  // A new "round" reshuffles the challenge order and every challenge's options.
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<number | null>(null);

  // Order of challenges this round.
  const deck = useMemo<FlawChallenge[]>(() => shuffled(SPOT_THE_FLAW), [round]);
  const challenge = deck[index];

  // Options shuffled per challenge; remember which displayed option is correct.
  const view = useMemo(() => {
    if (!challenge) return { options: [] as string[], correctDisplayIndex: 0 };
    const correctText = challenge.options[challenge.correctIndex];
    const options = shuffled(challenge.options);
    return { options, correctDisplayIndex: options.indexOf(correctText) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge?.id, round]);

  // Reset to the start whenever the dialog is opened.
  useEffect(() => {
    if (open) {
      setRound((r) => r + 1);
      setIndex(0);
      setSelected(null);
      setScore(0);
      setFinished(false);
      try {
        const raw = localStorage.getItem(BEST_KEY);
        setBest(raw != null ? Number(raw) : null);
      } catch {
        setBest(null);
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const answer = useCallback(
    (i: number) => {
      if (selected !== null) return; // already answered
      setSelected(i);
      if (i === view.correctDisplayIndex) setScore((s) => s + 1);
    },
    [selected, view.correctDisplayIndex]
  );

  const next = useCallback(() => {
    if (index + 1 >= deck.length) {
      setFinished(true);
      setBest((prevBest) => {
        const nextBest = prevBest == null ? score : Math.max(prevBest, score);
        try {
          localStorage.setItem(BEST_KEY, String(nextBest));
        } catch {
          /* ignore */
        }
        return nextBest;
      });
    } else {
      setIndex((n) => n + 1);
      setSelected(null);
    }
  }, [index, deck.length, score]);

  const restart = useCallback(() => {
    setRound((r) => r + 1);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }, []);

  if (!open) return null;

  const answered = selected !== null;
  const isLast = index + 1 >= deck.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <Search className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-zinc-50">Spot the Flaw</h2>
              <p className="text-xs text-zinc-500">
                {finished
                  ? "Results"
                  : `Question ${index + 1} of ${deck.length} · find the design flaw`}
              </p>
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
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {finished ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                <Award className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-zinc-50">
                  {score}
                  <span className="text-xl font-normal text-zinc-500"> / {deck.length}</span>
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {score === deck.length
                    ? "Flawless — you caught every one."
                    : score >= deck.length * 0.7
                      ? "Strong diagnosis skills."
                      : "Good practice — review the explanations and try again."}
                </p>
                {best != null && (
                  <p className="mt-2 text-xs text-zinc-500">Best: {best} / {deck.length}</p>
                )}
              </div>
              <button
                onClick={restart}
                className="mt-2 flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
              >
                <RotateCcw className="h-4 w-4" />
                Try again
              </button>
            </div>
          ) : challenge ? (
            <>
              <span className="inline-block rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                {challenge.concept}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{challenge.scenario}</p>

              <div className="mt-4">
                <ComponentDiagram
                  nodes={challenge.nodes}
                  edges={challenge.edges}
                  showLegend={false}
                />
              </div>

              <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                What's the most serious flaw?
              </p>
              <div className="space-y-2">
                {view.options.map((opt, i) => {
                  const isCorrect = i === view.correctDisplayIndex;
                  const isChosen = i === selected;
                  let cls =
                    "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800";
                  if (answered) {
                    if (isCorrect)
                      cls = "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
                    else if (isChosen)
                      cls = "border-rose-500/50 bg-rose-500/10 text-rose-200";
                    else cls = "border-zinc-800 bg-zinc-900 text-zinc-500 opacity-70";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => answer(i)}
                      disabled={answered}
                      className={`flex w-full items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${cls} ${
                        answered ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      {answered && isCorrect && (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      )}
                      {answered && isChosen && !isCorrect && (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                      )}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {answered && (
                <div className="mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] px-4 py-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
                    Why
                  </p>
                  <p className="text-sm leading-relaxed text-zinc-200">{challenge.explanation}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        {!finished && (
          <div className="flex shrink-0 items-center justify-between border-t border-zinc-800 px-6 py-3">
            <span className="text-xs text-zinc-500">Score: {score}</span>
            <button
              onClick={next}
              disabled={!answered}
              className="flex items-center gap-1.5 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLast ? "See results" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
