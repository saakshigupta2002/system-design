"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  X,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Award,
  RotateCcw,
  BookOpen,
  Shuffle,
} from "lucide-react";
import { ComponentDiagram } from "./ArchitectureDiagram";
import {
  PRACTICE_TOPICS,
  PRACTICE_QUESTION_COUNT,
  type PracticeTopic,
  type PracticeQuestion,
} from "@/data/practice";

const MIXED_COUNT = 15; // questions in a mixed round

/** Fisher–Yates shuffle returning a new array. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type View = "topics" | "study" | "quiz" | "results";

interface SpotTheFlawDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SpotTheFlawDialog({ open, onClose }: SpotTheFlawDialogProps) {
  const [view, setView] = useState<View>("topics");
  // null = "Mixed" review across all topics.
  const [topic, setTopic] = useState<PracticeTopic | null>(null);
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number | null>(null);

  const deckKey = topic ? topic.id : "mixed";

  // The questions for the current round.
  const deck = useMemo<PracticeQuestion[]>(() => {
    if (view !== "quiz" && view !== "results") return [];
    if (topic) return shuffled(topic.questions);
    const all = PRACTICE_TOPICS.flatMap((t) => t.questions);
    return shuffled(all).slice(0, MIXED_COUNT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey, round, view === "quiz" || view === "results"]);

  const question = deck[index];

  // Options shuffled per question; remember which displayed option is correct.
  const optView = useMemo(() => {
    if (!question) return { options: [] as string[], correctDisplayIndex: 0 };
    const correctText = question.options[question.correctIndex];
    const options = shuffled(question.options);
    return { options, correctDisplayIndex: options.indexOf(correctText) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, round]);

  // Reset to the topic list whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setView("topics");
      setTopic(null);
      setIndex(0);
      setSelected(null);
      setScore(0);
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

  const startQuiz = useCallback((t: PracticeTopic | null) => {
    setTopic(t);
    setRound((r) => r + 1);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setView("quiz");
    try {
      const raw = localStorage.getItem(`practice-best-${t ? t.id : "mixed"}`);
      setBest(raw != null ? Number(raw) : null);
    } catch {
      setBest(null);
    }
  }, []);

  const answer = useCallback(
    (i: number) => {
      if (selected !== null) return;
      setSelected(i);
      if (i === optView.correctDisplayIndex) setScore((s) => s + 1);
    },
    [selected, optView.correctDisplayIndex]
  );

  const next = useCallback(() => {
    if (index + 1 >= deck.length) {
      setView("results");
      setBest((prev) => {
        const nextBest = prev == null ? score : Math.max(prev, score);
        try {
          localStorage.setItem(`practice-best-${deckKey}`, String(nextBest));
        } catch {
          /* ignore */
        }
        return nextBest;
      });
    } else {
      setIndex((n) => n + 1);
      setSelected(null);
    }
  }, [index, deck.length, score, deckKey]);

  if (!open) return null;

  const answered = selected !== null;
  const isLast = index + 1 >= deck.length;

  const headerSubtitle =
    view === "quiz"
      ? `${topic ? topic.title : "Mixed review"} · ${index + 1} of ${deck.length}`
      : view === "results"
        ? "Results"
        : view === "study"
          ? topic?.title ?? "Study"
          : `${PRACTICE_TOPICS.length} topics · ${PRACTICE_QUESTION_COUNT} questions`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {view !== "topics" && (
              <button
                onClick={() => setView(view === "study" ? "topics" : "topics")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Back to topics"
                title="Back to topics"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
              <GraduationCap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-zinc-50">Concept Practice</h2>
              <p className="truncate text-xs text-zinc-500">{headerSubtitle}</p>
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
          {/* ── Topic list ── */}
          {view === "topics" && (
            <div className="space-y-4">
              <button
                onClick={() => startQuiz(null)}
                className="flex w-full items-center gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/[0.07] px-4 py-3 text-left transition-colors hover:bg-cyan-500/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-500/15">
                  <Shuffle className="h-4 w-4 text-cyan-400" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-zinc-100">Mixed review</span>
                  <span className="block text-xs text-zinc-400">
                    {MIXED_COUNT} random questions across every topic
                  </span>
                </span>
              </button>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Topics
                </p>
                {PRACTICE_TOPICS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTopic(t);
                      setView("study");
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-100">{t.title}</span>
                      <span className="block truncate text-xs text-zinc-500">{t.blurb}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
                      {t.questions.length}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Study a topic ── */}
          {view === "study" && topic && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3.5">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{topic.title}</p>
                  <p className="text-xs text-zinc-400">{topic.blurb}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Key points
                </p>
                <ul className="space-y-2">
                  {topic.study.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-zinc-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => startQuiz(topic)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
              >
                Practice this topic ({topic.questions.length} questions)
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ── Results ── */}
          {view === "results" && (
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
                  {deck.length > 0 && score === deck.length
                    ? "Perfect — you've got this topic down."
                    : score >= deck.length * 0.7
                      ? "Strong — a few to review."
                      : "Good practice — review the key points and try again."}
                </p>
                {best != null && (
                  <p className="mt-2 text-xs text-zinc-500">Best: {best} / {deck.length}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startQuiz(topic)}
                  className="flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try again
                </button>
                <button
                  onClick={() => setView("topics")}
                  className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
                >
                  All topics
                </button>
              </div>
            </div>
          )}

          {/* ── Quiz ── */}
          {view === "quiz" && question && (
            <>
              {question.scenario && (
                <p className="text-sm leading-relaxed text-zinc-300">{question.scenario}</p>
              )}

              {question.nodes && question.nodes.length > 0 && (
                <div className="mt-4">
                  <ComponentDiagram
                    nodes={question.nodes}
                    edges={question.edges ?? []}
                    showLegend={false}
                  />
                </div>
              )}

              <p className="mt-5 mb-2 text-sm font-semibold text-zinc-100">{question.prompt}</p>
              <div className="space-y-2">
                {optView.options.map((opt, i) => {
                  const isCorrect = i === optView.correctDisplayIndex;
                  const isChosen = i === selected;
                  let cls =
                    "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800";
                  if (answered) {
                    if (isCorrect) cls = "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
                    else if (isChosen) cls = "border-rose-500/50 bg-rose-500/10 text-rose-200";
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
                  <p className="text-sm leading-relaxed text-zinc-200">{question.explanation}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer (quiz only) */}
        {view === "quiz" && (
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
