import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AiProvider = "anthropic" | "openai" | "google";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  google: "Google (Gemini)",
};

/** Suggested model ids per provider. Users can also type a custom id, since
 *  provider model names change over time. */
export const PROVIDER_MODELS: Record<AiProvider, string[]> = {
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5-20251001"],
  openai: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
  google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
};

/** Where each provider issues API keys, shown as a help link in settings. */
export const PROVIDER_KEY_URLS: Record<AiProvider, string> = {
  anthropic: "https://console.anthropic.com/settings/keys",
  openai: "https://platform.openai.com/api-keys",
  google: "https://aistudio.google.com/apikey",
};

interface AiAssistantState {
  provider: AiProvider;
  /** API key per provider so switching providers doesn't lose the others. */
  keys: Record<AiProvider, string>;
  /** Selected model per provider. */
  models: Record<AiProvider, string>;
  /** Chat transcript (ephemeral — not persisted). */
  messages: AiMessage[];

  setProvider: (p: AiProvider) => void;
  setKey: (p: AiProvider, key: string) => void;
  setModel: (p: AiProvider, model: string) => void;
  addMessage: (m: AiMessage) => void;
  clearMessages: () => void;
}

export const useAiAssistantStore = create<AiAssistantState>()(
  persist(
    (set) => ({
      provider: "anthropic",
      keys: { anthropic: "", openai: "", google: "" },
      models: {
        anthropic: PROVIDER_MODELS.anthropic[0],
        openai: PROVIDER_MODELS.openai[0],
        google: PROVIDER_MODELS.google[0],
      },
      messages: [],

      setProvider: (provider) => set({ provider }),
      setKey: (p, key) => set((s) => ({ keys: { ...s.keys, [p]: key } })),
      setModel: (p, model) => set((s) => ({ models: { ...s.models, [p]: model } })),
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "systemdesign-ai-assistant",
      // Persist config only — never the transcript.
      partialize: (state) => ({
        provider: state.provider,
        keys: state.keys,
        models: state.models,
      }),
    }
  )
);
