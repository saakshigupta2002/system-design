import type { AiProvider, AiMessage } from "@/store/aiAssistantStore";

interface ChatRequest {
  provider: AiProvider;
  model: string;
  apiKey: string;
  system: string;
  messages: AiMessage[];
}

/**
 * Bring-your-own-key chat call made directly from the browser to the chosen
 * provider. The user's key is read from their own browser storage and sent
 * only to the provider — it never passes through any server we run.
 */
export async function sendChat({ provider, model, apiKey, system, messages }: ChatRequest): Promise<string> {
  switch (provider) {
    case "anthropic":
      return callAnthropic(model, apiKey, system, messages);
    case "openai":
      return callOpenAI(model, apiKey, system, messages);
    case "google":
      return callGoogle(model, apiKey, system, messages);
  }
}

async function readError(res: Response, provider: string): Promise<string> {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message ?? body?.message ?? JSON.stringify(body);
  } catch {
    detail = await res.text().catch(() => "");
  }
  if (res.status === 401 || res.status === 403) {
    return `${provider}: your API key was rejected (${res.status}). Check the key and try again.`;
  }
  if (res.status === 429) {
    return `${provider}: rate limited or out of quota (429). ${detail}`;
  }
  return `${provider} error ${res.status}: ${detail || "request failed"}`;
}

async function callAnthropic(model: string, apiKey: string, system: string, messages: AiMessage[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      // Required for calling the API directly from a browser.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "Anthropic"));
  const data = await res.json();
  return (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("")
    .trim();
}

async function callOpenAI(model: string, apiKey: string, system: string, messages: AiMessage[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "OpenAI"));
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

async function callGoogle(model: string, apiKey: string, system: string, messages: AiMessage[]): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    }
  );
  if (!res.ok) throw new Error(await readError(res, "Google"));
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text ?? "").join("").trim();
}
