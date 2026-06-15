"use client";

import { useEffect, useRef, useState } from "react";
import { X, Settings, Send, Sparkles, Trash2, Loader2, ExternalLink, Eye, EyeOff } from "lucide-react";
import {
  useAiAssistantStore,
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  PROVIDER_KEY_URLS,
  type AiProvider,
} from "@/store/aiAssistantStore";
import { sendChat } from "@/lib/aiClient";
import { useCanvasStore, type ComponentNodeData } from "@/store/canvasStore";
import { useAppStore } from "@/store/appStore";
import { useSimulationStore } from "@/store/simulationStore";
import { useInterviewStore } from "@/store/interviewStore";
import { getProblemById } from "@/data/problems";

const QUICK_PROMPTS = [
  "Review my current design",
  "What's missing or weak here?",
  "Explain the key trade-offs",
  "How would this scale to 10× traffic?",
];

/** Builds a fresh context snapshot (problem + canvas + score) each send so the
 *  assistant can teach against what the user is actually looking at. */
function buildSystemPrompt(): string {
  const problemId = useAppStore.getState().selectedProblemId;
  const problem = getProblemById(problemId);
  const { nodes, edges } = useCanvasStore.getState();
  const scoreResult = useSimulationStore.getState().scoreResult;

  const componentNodes = nodes.filter((n) => n.type !== "text");
  const counts = new Map<string, number>();
  for (const n of componentNodes) {
    const label = (n.data as ComponentNodeData).label;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const componentList =
    [...counts.entries()].map(([l, c]) => (c > 1 ? `${l} (×${c})` : l)).join(", ") || "none yet";

  const edgeList =
    edges
      .map((e) => {
        const s = nodes.find((n) => n.id === e.source);
        const t = nodes.find((n) => n.id === e.target);
        const sl = (s?.data as ComponentNodeData | undefined)?.label ?? "?";
        const tl = (t?.data as ComponentNodeData | undefined)?.label ?? "?";
        return `${sl} → ${tl}`;
      })
      .slice(0, 40)
      .join("; ") || "none yet";

  const lines: string[] = [
    "You are an expert system design interview coach embedded in a practice tool.",
    "Coach the candidate: answer clearly, point out weaknesses, ask probing follow-up questions, and teach the underlying concepts. Guide them toward the answer rather than dumping a full solution. Keep replies concise and focused.",
    "",
  ];
  if (problem) {
    lines.push(
      `PROBLEM: ${problem.title}`,
      `Description: ${problem.description}`,
      `Requirements: ${problem.requirements.users}, ${problem.requirements.readsPerSec} reads/s, ${problem.requirements.writesPerSec} writes/s, ${problem.requirements.storageGB}GB, <${problem.requirements.latencyMs}ms`,
    );
    if (problem.constraints.length) lines.push(`Constraints: ${problem.constraints.join("; ")}`);
  }
  lines.push(
    "",
    `CANDIDATE'S CURRENT DESIGN:`,
    `Components: ${componentList}`,
    `Connections: ${edgeList}`,
  );
  if (scoreResult) {
    lines.push(
      `Latest score: ${scoreResult.total}/100 (${scoreResult.verdict}) — ` +
        scoreResult.categories.map((c) => `${c.category} ${c.score}/${c.maxScore}`).join(", "),
    );
  }
  return lines.join("\n");
}

export function AIAssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const provider = useAiAssistantStore((s) => s.provider);
  const keys = useAiAssistantStore((s) => s.keys);
  const models = useAiAssistantStore((s) => s.models);
  const messages = useAiAssistantStore((s) => s.messages);
  const addMessage = useAiAssistantStore((s) => s.addMessage);
  const clearMessages = useAiAssistantStore((s) => s.clearMessages);

  const apiKey = keys[provider];
  const model = models[provider];

  const interviewMode = useInterviewStore((s) => s.mode);
  const [showConfig, setShowConfig] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sit below the top bar — and the interview bar when it's showing.
  const topClass = interviewMode === "interview" ? "top-[5.75rem]" : "top-12";

  // Open the config screen automatically if the active provider has no key.
  useEffect(() => {
    if (open && !apiKey) setShowConfig(true);
  }, [open, apiKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (!apiKey) {
      setShowConfig(true);
      return;
    }
    setError(null);
    setInput("");
    addMessage({ role: "user", content: trimmed });
    setLoading(true);
    try {
      const history = [...useAiAssistantStore.getState().messages];
      const reply = await sendChat({
        provider,
        model,
        apiKey,
        system: buildSystemPrompt(),
        messages: history,
      });
      addMessage({ role: "assistant", content: reply || "(empty response)" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      className={`fixed right-0 bottom-0 z-40 flex w-full flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform sm:w-[400px] ${topClass} ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <div>
            <p className="text-sm font-semibold text-zinc-100">AI Assistant</p>
            <p className="text-[11px] text-zinc-500">
              {apiKey ? `${PROVIDER_LABELS[provider]} · ${model}` : "Bring your own API key"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              title="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowConfig((v) => !v)}
            className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-800 ${showConfig ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showConfig ? (
        <ConfigView onDone={() => apiKey && setShowConfig(false)} />
      ) : (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-zinc-400">
                  Ask anything about this problem or your design — it can see the current problem
                  and what you&apos;ve built on the canvas.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-cyan-600/20 text-zinc-100"
                    : "bg-zinc-900 text-zinc-300"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            )}
            {error && (
              <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs leading-relaxed text-rose-400">
                {error}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-zinc-800 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder={apiKey ? "Ask the assistant…" : "Add an API key in settings to start"}
                className="max-h-32 min-h-[38px] flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-[13px] text-zinc-200 placeholder-zinc-500 outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md bg-cyan-600 text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
                title="Send (Enter)"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function ConfigView({ onDone }: { onDone: () => void }) {
  const provider = useAiAssistantStore((s) => s.provider);
  const keys = useAiAssistantStore((s) => s.keys);
  const models = useAiAssistantStore((s) => s.models);
  const setProvider = useAiAssistantStore((s) => s.setProvider);
  const setKey = useAiAssistantStore((s) => s.setKey);
  const setModel = useAiAssistantStore((s) => s.setModel);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
      {/* Provider */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-300">Provider</label>
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(PROVIDER_LABELS) as AiProvider[]).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${
                provider === p
                  ? "border border-cyan-500/30 bg-cyan-600/20 text-cyan-400"
                  : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {PROVIDER_LABELS[p].replace(/ \(.*\)/, "")}
            </button>
          ))}
        </div>
      </div>

      {/* API key */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-300">API key</label>
          <a
            href={PROVIDER_KEY_URLS[provider]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
          >
            Get a key <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={keys[provider]}
            onChange={(e) => setKey(provider, e.target.value)}
            placeholder={`Paste your ${PROVIDER_LABELS[provider].replace(/ \(.*\)/, "")} key`}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 pr-8 font-mono text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            title={showKey ? "Hide" : "Show"}
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Model */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-300">Model</label>
        <input
          type="text"
          value={models[provider]}
          onChange={(e) => setModel(provider, e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 font-mono text-xs text-zinc-200 outline-none focus:border-cyan-500"
        />
        <div className="flex flex-wrap gap-1">
          {PROVIDER_MODELS[provider].map((m) => (
            <button
              key={m}
              onClick={() => setModel(provider, m)}
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] transition-colors ${
                models[provider] === m
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <p className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
        Your key is stored only in this browser and sent directly to{" "}
        {PROVIDER_LABELS[provider].replace(/ \(.*\)/, "")} when you chat. It never passes through
        any server we run. Clear it any time by emptying this field.
      </p>

      <button
        onClick={onDone}
        disabled={!keys[provider]}
        className="w-full rounded-md bg-cyan-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Start chatting
      </button>
    </div>
  );
}
