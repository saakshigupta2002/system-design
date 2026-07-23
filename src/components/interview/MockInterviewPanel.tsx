"use client";

import { useMemo, useRef, useState } from "react";
import { X, GraduationCap, Send, Loader2, Sparkles, ChevronLeft, ChevronRight, Check, Lightbulb, ListChecks } from "lucide-react";
import type { Node } from "@xyflow/react";
import { useAppStore } from "@/store/appStore";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { useDeepDiveStore } from "@/store/deepDiveStore";
import { useDrillProgressStore } from "@/store/drillProgressStore";
import { isLearned as recIsLearned } from "@/lib/srs";
import { getProblemById } from "@/data/problems";
import type { Problem } from "@/types/problem";
import type { AiMessage } from "@/store/aiAssistantStore";
import {
  hasAiKey,
  scriptedQuestions,
  seedContext,
  askInterviewer,
  CRITIQUE_REQUEST,
} from "@/lib/interviewer";

const DIFFICULTY_STYLES: Record<Problem["difficulty"], string> = {
  Easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  Hard: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

export function MockInterviewPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const problemId = useAppStore((s) => s.selectedProblemId);
  const problem = getProblemById(problemId);
  const keyPresent = hasAiKey();
  const [mode, setMode] = useState<"scripted" | "ai">(keyPresent ? "ai" : "scripted");

  // How many questions the scripted set will hold for this problem — surfaced
  // in the context banner so it's clear the set is problem-specific.
  const questionCount = useMemo(() => scriptedQuestions(problemId).length, [problemId]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl sm:w-[440px]">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800 bg-gradient-to-b from-zinc-800/40 to-transparent px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <GraduationCap className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Mock Interview</p>
              <p className="text-[11px] text-zinc-500">Get probed on your design, one question at a time</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Problem context — makes it explicit the questions are scoped to the
            currently selected problem, and updates live when it changes. */}
        <div className="border-b border-zinc-800 px-4 py-3">
          {problem ? (
            <div className="rounded-lg border border-zinc-700/70 bg-zinc-800/40 p-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Interviewing on</span>
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold ${DIFFICULTY_STYLES[problem.difficulty]}`}>
                  {problem.difficulty}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-zinc-100">{problem.title}</p>
              {problem.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {problem.tags.slice(0, 4).map((t) => (
                    <span key={t} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{t}</span>
                  ))}
                </div>
              )}
              <p className="mt-2 flex items-center gap-1 text-[10px] leading-relaxed text-zinc-500">
                <ListChecks className="h-3 w-3 shrink-0" />
                {mode === "scripted"
                  ? <>{questionCount} follow-up questions for this problem · switch problems in the sidebar to load a new set</>
                  : <>The AI adapts to this problem and your current design · switch problems to change the focus</>}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-800/30 p-3 text-center">
              <p className="text-xs font-medium text-zinc-300">No problem selected</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                Pick a problem from the Problems tab in the sidebar to load a tailored set of interview questions.
              </p>
            </div>
          )}
        </div>

        {/* Mode switch */}
        <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-2.5">
          <button
            onClick={() => setMode("scripted")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${mode === "scripted" ? "bg-zinc-700 text-zinc-100 shadow-sm" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-300"}`}
          >
            <ListChecks className="h-3.5 w-3.5" /> Scripted
          </button>
          <button
            onClick={() => setMode("ai")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${mode === "ai" ? "bg-zinc-700 text-zinc-100 shadow-sm" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-300"}`}
          >
            <Sparkles className="h-3.5 w-3.5" /> AI {!keyPresent && <span className="text-zinc-500">(needs key)</span>}
          </button>
        </div>

        {!problem ? (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-zinc-500">
            Select a problem to start a mock interview.
          </div>
        ) : mode === "scripted" ? (
          // Keyed by problem so switching problems cleanly resets to question 1.
          <ScriptedInterview key={problemId} problemId={problemId} />
        ) : (
          <AiInterview key={problemId} problemId={problemId} keyPresent={keyPresent} />
        )}
      </aside>
    </>
  );
}

function ScriptedInterview({ problemId }: { problemId: string }) {
  const questions = useMemo(() => scriptedQuestions(problemId), [problemId]);
  const [index, setIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const records = useDrillProgressStore((s) => s.records);
  const review = useDrillProgressStore((s) => s.review);

  // Guard against an out-of-range index (defensive — key remount resets it).
  const safeIndex = Math.min(index, questions.length - 1);
  const q = questions[safeIndex];
  const goto = (i: number) => { setIndex(i); setShowHint(false); setRevealed(false); };
  const reviewed = questions.filter((x) => recIsLearned(records[x.id])).length;
  const learned = recIsLearned(records[q.id]);
  const progress = Math.round((reviewed / questions.length) * 100);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-medium text-zinc-300">Question {safeIndex + 1} <span className="text-zinc-600">/ {questions.length}</span></span>
          <span className="text-zinc-500">{reviewed} reviewed</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* Question card */}
        <div className="rounded-lg border border-zinc-700/70 bg-zinc-800/40 p-3.5">
          <div className="flex gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-[11px] font-semibold text-cyan-400">
              {safeIndex + 1}
            </span>
            <p className="text-sm leading-relaxed text-zinc-100">{q.question}</p>
          </div>
          {showHint ? (
            <p className="mt-3 flex gap-1.5 rounded-md bg-amber-500/5 p-2 text-xs italic leading-relaxed text-amber-300/80">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {q.hint}
            </p>
          ) : (
            <button onClick={() => setShowHint(true)} className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-amber-400/90 hover:text-amber-300">
              <Lightbulb className="h-3.5 w-3.5" /> Show hint
            </button>
          )}
        </div>

        {revealed ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">
              <Check className="h-3 w-3" /> Model answer
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">{q.answer}</p>
          </div>
        ) : (
          <button onClick={() => setRevealed(true)} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700">
            Reveal model answer
          </button>
        )}

        <div className="pt-1">
          <p className="mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-600">
            How did you do?{learned && <Check className="h-3 w-3 text-emerald-500" />}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => { review(q.id, "again"); goto(safeIndex); }}
              className="flex-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/15"
            >
              Again
            </button>
            <button
              onClick={() => { review(q.id, "good"); goto(Math.min(questions.length - 1, safeIndex + 1)); }}
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              Got it
            </button>
            <button
              onClick={() => { review(q.id, "easy"); goto(Math.min(questions.length - 1, safeIndex + 1)); }}
              className="flex-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/15"
            >
              Easy
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 p-2.5">
        <button onClick={() => goto(Math.max(0, safeIndex - 1))} disabled={safeIndex === 0} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-40">
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <button onClick={() => goto(Math.min(questions.length - 1, safeIndex + 1))} disabled={safeIndex === questions.length - 1} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-40">
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AiInterview({ problemId, keyPresent }: { problemId: string; keyPresent: boolean }) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => requestAnimationFrame(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  });

  async function run(next: AiMessage[]) {
    const problem = getProblemById(problemId);
    if (!problem) return;
    setMessages(next);
    setLoading(true);
    setError(null);
    scrollDown();
    try {
      const reply = await askInterviewer(problem, next);
      setMessages([...next, { role: "assistant", content: reply }]);
      scrollDown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function start() {
    const problem = getProblemById(problemId);
    if (!problem) return;
    const { nodes, edges } = useCanvasStore.getState();
    const componentNodes = nodes.filter((n) => n.type !== "text") as Node<ComponentNodeData>[];
    const deepDive = useDeepDiveStore.getState().getEntry(problemId);
    run([{ role: "user", content: seedContext(problem, componentNodes, edges, deepDive) }]);
  }

  function submit() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    run([...messages, { role: "user", content: text }]);
  }

  if (!keyPresent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <Sparkles className="h-5 w-5 text-zinc-600" />
        <p className="text-xs text-zinc-400">AI mode needs an API key.</p>
        <p className="max-w-[260px] text-[11px] leading-relaxed text-zinc-500">
          Add your key in the AI assistant (top bar) to get an adaptive interviewer that reacts to your design. Until then, use Scripted mode — it works fully offline.
        </p>
      </div>
    );
  }

  // The seed message (index 0) is context, not a visible turn.
  const visible = messages.slice(1);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
              <Sparkles className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="max-w-[260px] text-xs leading-relaxed text-zinc-500">
              The interviewer will probe your current design and deep-dive answers, one question at a time.
            </p>
            <button onClick={start} className="rounded-md bg-cyan-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-cyan-500">
              Start interview
            </button>
          </div>
        ) : (
          visible.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed ${m.role === "user" ? "bg-cyan-600/20 text-cyan-50" : "bg-zinc-800 text-zinc-200"}`}>
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Interviewer is thinking…
          </div>
        )}
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>

      {messages.length > 0 && (
        <div className="space-y-2 border-t border-zinc-800 p-2.5">
          {!loading && (
            <button onClick={() => run([...messages, { role: "user", content: CRITIQUE_REQUEST }])} className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-[11px] text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200">
              Wrap up &amp; critique my reasoning
            </button>
          )}
          <div className="flex items-end gap-1.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Type your answer…"
              rows={2}
              className="min-w-0 flex-1 resize-none rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:ring-1 focus:ring-cyan-500/40"
            />
            <button onClick={submit} disabled={loading || !input.trim()} className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-600 text-white transition-colors hover:bg-cyan-500 disabled:opacity-40" aria-label="Send">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
