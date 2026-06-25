import type { Problem } from "@/types/problem";
import type { DeepDiveEntry } from "@/types/deepDive";
import { useAiAssistantStore } from "@/store/aiAssistantStore";
import { sendChat } from "@/lib/aiClient";

/**
 * AI review of the free-text / open-ended parts of the deep dive. Deterministic
 * grading (deepDive.ts) checks API/schema coverage against the reference, but it
 * can't judge *reasoning* — especially the consistency justification. When a BYO
 * key is present, this asks the model to critique those choices.
 */

const SYSTEM =
  "You are a senior staff engineer reviewing a candidate's system-design deep-dive decisions. " +
  "Critique their API design, data model and partition-key choices, and especially their consistency model and its justification. " +
  "Be concise and specific: call out what's solid, the biggest gaps, and concrete improvements. Use short bullet points, no preamble.";

export function buildDeepDiveReviewPrompt(problem: Problem, entry: DeepDiveEntry): { system: string; user: string } {
  const apis = (entry.apis ?? []).filter((a) => a.path.trim());
  const entities = (entry.entities ?? []).filter((e) => e.name.trim());
  const lines: string[] = [
    `Problem: ${problem.title} — ${problem.description}`,
    `Requirements: ${problem.requirements.users}, ${problem.requirements.readsPerSec} reads/s, ${problem.requirements.writesPerSec} writes/s, ${problem.requirements.storageGB} GB, <${problem.requirements.latencyMs}ms.`,
    "",
    "My API design:",
    apis.length ? apis.map((a) => `  ${a.method} ${a.path}`).join("\n") : "  (none provided)",
    "",
    "My data model:",
    entities.length
      ? entities.map((e) => `  ${e.name} [${e.type || "?"}]${e.partitionKey ? ` partition key: ${e.partitionKey}` : " (no partition key)"}`).join("\n")
      : "  (none provided)",
    "",
    `My consistency choice: ${entry.consistency || "(none)"}`,
    `My justification: ${entry.consistencyNote?.trim() || "(none)"}`,
    "",
    "Review my decisions for this problem.",
  ];
  return { system: SYSTEM, user: lines.join("\n") };
}

/** Call the configured provider to review the deep-dive entry. Throws on key/API errors. */
export async function reviewDeepDive(problem: Problem, entry: DeepDiveEntry): Promise<string> {
  const s = useAiAssistantStore.getState();
  const { system, user } = buildDeepDiveReviewPrompt(problem, entry);
  return sendChat({
    provider: s.provider,
    model: s.models[s.provider],
    apiKey: s.keys[s.provider],
    system,
    messages: [{ role: "user", content: user }],
  });
}
