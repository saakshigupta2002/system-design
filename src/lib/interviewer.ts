import type { Node, Edge } from "@xyflow/react";
import type { ComponentNodeData } from "@/store/canvasStore";
import type { Problem } from "@/types/problem";
import type { DeepDiveEntry } from "@/types/deepDive";
import { useAiAssistantStore, type AiMessage } from "@/store/aiAssistantStore";
import { sendChat } from "@/lib/aiClient";
import { roleOf } from "@/data/roles";
import { getInterviewData } from "@/data/interviewData";

/** A scripted interview question with a model answer the candidate self-rates. */
export interface ScriptedQuestion {
  /** Stable id, shared with the drill library so progress is unified. */
  id: string;
  question: string;
  hint: string;
  answer: string;
}

/** True when the user has a bring-your-own API key for the active provider, so
 *  the interviewer can run in adaptive AI mode rather than scripted mode. */
export function hasAiKey(): boolean {
  const s = useAiAssistantStore.getState();
  return !!s.keys[s.provider]?.trim();
}

/** Universal deep-dive questions used when a problem has no authored answer key. */
const GENERIC_QUESTIONS: ScriptedQuestion[] = [
  { id: "generic:spof", question: "Where are the single points of failure, and how do you remove them?", hint: "Look for any component with no replica on the request path.", answer: "Run every stateful component with replicas and put stateless services behind a load balancer so any instance can fail without downtime; add health checks and automatic failover." },
  { id: "generic:scale10x", question: "What breaks first at 10× traffic, and what do you do about it?", hint: "Find the lowest-capacity component on the hot path.", answer: "Usually the database or a single service tier saturates first. Add caching to shed reads, shard or add read replicas, and horizontally scale stateless tiers behind the load balancer." },
  { id: "generic:consistency", question: "Where do you need strong consistency, and where is eventual consistency acceptable?", hint: "Separate money/auth-critical writes from feeds/analytics.", answer: "Strong consistency for correctness-critical paths (payments, inventory, auth); eventual consistency for high-volume, tolerant data (feeds, counters, analytics) to gain availability and throughput." },
  { id: "generic:cache", question: "What's your caching and invalidation strategy?", hint: "Cache-aside vs write-through; TTLs vs explicit invalidation.", answer: "Cache-aside for read-heavy data with TTLs; invalidate or write-through on updates to avoid stale reads. Watch for thundering-herd on expiry and cache stampede." },
  { id: "generic:bottleneck", question: "How do you detect and respond to a production incident here?", hint: "Think metrics, alerts, and graceful degradation.", answer: "Emit metrics (latency, error rate, saturation), alert on SLO breaches, and degrade gracefully (serve stale cache, shed load, circuit-break failing dependencies) while you recover." },
];

/** Scripted questions for a problem: its authored follow-ups, or generics. */
export function scriptedQuestions(problemId: string): ScriptedQuestion[] {
  const data = getInterviewData(problemId);
  if (data && data.followUpQuestions.length > 0) {
    return data.followUpQuestions.map((q) => ({
      id: `${problemId}:${q.id}`,
      question: q.question,
      hint: q.hint,
      answer: q.answer,
    }));
  }
  return GENERIC_QUESTIONS;
}

/** Plain-text summary of the candidate's current design (role-aware). */
export function designSummary(nodes: Node<ComponentNodeData>[], edges: Edge[]): string {
  const comps = nodes.filter((n) => n.type !== "text");
  if (comps.length === 0) return "No components placed yet.";
  const parts = comps.map((n) => {
    const role = roleOf(n.data.componentId);
    return role !== n.data.componentId ? `${n.data.label} (${role})` : n.data.label;
  });
  return `Components: ${parts.join(", ")}. ${edges.length} connection(s).`;
}

function deepDiveSummary(entry?: DeepDiveEntry): string {
  if (!entry) return "No deep-dive answers yet.";
  const bits: string[] = [];
  if (entry.apis?.length) bits.push(`APIs: ${entry.apis.map((a) => `${a.method} ${a.path}`).join(", ")}`);
  if (entry.entities?.length)
    bits.push(`Entities: ${entry.entities.map((e) => `${e.name}${e.partitionKey ? ` (PK ${e.partitionKey})` : ""}`).join(", ")}`);
  if (entry.consistency) bits.push(`Consistency: ${entry.consistency}${entry.consistencyNote ? ` — ${entry.consistencyNote}` : ""}`);
  return bits.length ? bits.join("\n") : "No deep-dive answers yet.";
}

function systemPrompt(problem: Problem): string {
  return [
    `You are a senior staff engineer running a system design interview for "${problem.title}".`,
    "Ask ONE probing question at a time about the candidate's design — trade-offs, scaling, failure modes, data model, and consistency.",
    "Be Socratic and concise (2-4 sentences). After they answer, briefly acknowledge what was good or missing, then ask the next, deeper question. Never write a full solution essay.",
  ].join(" ");
}

/** Seed message describing the candidate's current work, so the AI's first
 *  question reacts to what they've actually built. */
export function seedContext(
  problem: Problem,
  nodes: Node<ComponentNodeData>[],
  edges: Edge[],
  deepDive?: DeepDiveEntry
): string {
  return [
    `Problem: ${problem.title} — ${problem.description}`,
    `Requirements: ${problem.requirements.users}, ${problem.requirements.readsPerSec} reads/s, ${problem.requirements.writesPerSec} writes/s, <${problem.requirements.latencyMs}ms.`,
    "",
    "My current design:",
    designSummary(nodes, edges),
    "",
    "My deep-dive answers:",
    deepDiveSummary(deepDive),
    "",
    "Start the interview with your first question.",
  ].join("\n");
}

/** Ask the AI interviewer for its next turn. Throws on API/key errors. */
export async function askInterviewer(problem: Problem, messages: AiMessage[]): Promise<string> {
  const s = useAiAssistantStore.getState();
  return sendChat({
    provider: s.provider,
    model: s.models[s.provider],
    apiKey: s.keys[s.provider],
    system: systemPrompt(problem),
    messages,
  });
}

/** Final-critique prompt appended when the candidate ends the session. */
export const CRITIQUE_REQUEST =
  "That's the end. Now give me a concise critique of my reasoning across this interview: what was strong, the biggest gaps, and the top 2-3 things to improve. Use short bullet points.";
