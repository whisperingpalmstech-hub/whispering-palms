/**
 * LLM provider/model selection for AnythingLLM workspaces.
 *
 * WHY THIS EXISTS
 * ---------------
 * AnythingLLM resolves a workspace's model in this order:
 *   1. the workspace's own chatProvider/chatModel  (what we set here)
 *   2. the instance-wide LLMProvider/LLMModel      (admin UI only)
 *
 * The instance default was left on DeepSeek `deepseek-v4-flash`, a model the
 * DeepSeek API rejects for chat completion, so every workspace that inherited
 * it failed with "is not valid for chat completion" — 320 of 321 workspaces,
 * i.e. every reading and every daily horoscope. The instance default can only
 * be changed from the admin UI, but per-workspace overrides win over it and
 * are writable through the API, so we pin the model at workspace creation and
 * never depend on the instance default being sane.
 *
 * Verified against the live instance (2026-09-15) by issuing a real chat
 * completion for each candidate. Keep MODEL_OPTIONS in sync with reality —
 * Groq retired the llama-3.x ids on 2026-08-16.
 */

export interface ModelOption {
  provider: string
  model: string
  /** Shown in docs/admin UI, not sent to AnythingLLM. */
  note: string
}

/**
 * Chat models confirmed working on this instance. The first entry is the
 * default. Override per-environment with ANYTHINGLLM_CHAT_PROVIDER /
 * ANYTHINGLLM_CHAT_MODEL — no deploy needed to switch.
 */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    provider: 'deepseek',
    model: 'deepseek-flash',
    note: 'Default. The DeepSeek account has credit and this model is vision-capable, so the same provider serves readings and palm-photo analysis. Verified 3/3 on the app prompt contract: correct [ENGLISH_START]/[LOCAL_START] tags and real Devanagari, ~6s.',
  },
  {
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    note: 'Fallback. Format-compliant and fast (~2s). Use if DeepSeek is degraded.',
  },
  {
    provider: 'groq',
    model: 'qwen/qwen3.8-27b',
    note: 'Fallback. Comparable quality and format compliance.',
  },
  {
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    note: 'Smaller and cheaper; format compliant, slightly shallower readings.',
  },
]

/**
 * deepseek-v4-pro is deliberately NOT offered. It is a reasoning model that
 * spends its whole completion budget on reasoning tokens for this prompt and
 * returns an EMPTY answer (finish_reason "length", 8000/8000 reasoning
 * tokens). deepseek-flash reasons too but still emits the answer.
 */

/** Providers whose credentials are present but NOT usable, with the observed error. */
export const KNOWN_BROKEN = [
  { provider: 'deepseek/deepseek-v4-flash', reason: 'model id does not exist; the real ids are deepseek-flash and deepseek-v4-pro' },
  { provider: 'gemini', reason: 'key present but returns HTTP 400' },
  { provider: 'mistral', reason: 'returns HTTP 403/429 (no quota)' },
]

export function getChatModelConfig(): { chatProvider: string; chatModel: string } {
  const provider = process.env.ANYTHINGLLM_CHAT_PROVIDER?.trim()
  const model = process.env.ANYTHINGLLM_CHAT_MODEL?.trim()

  // Both must be set together: a provider without a matching model (or vice
  // versa) is how you end up back at the broken instance default.
  if (provider && model) {
    return { chatProvider: provider, chatModel: model }
  }

  return {
    chatProvider: MODEL_OPTIONS[0].provider,
    chatModel: MODEL_OPTIONS[0].model,
  }
}
