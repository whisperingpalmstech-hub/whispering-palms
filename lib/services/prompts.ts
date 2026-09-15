/**
 * Versioned system prompts.
 *
 * The astrologer persona used to be a string literal defined independently in
 * lib/services/llm-service.ts and lib/services/anythingllm.ts. The two had
 * already drifted, changing the tone required a deploy, and there was no way to
 * tell which text produced a given reading.
 *
 * Prompts now live in the `prompts` table, append-only, with one active version
 * per name. If the table is empty or unreachable, the caller's built-in default
 * is used - so this is additive and cannot break generation.
 */

import { createAdminClient } from '@/lib/supabase/admin'

/** Prompt names the app knows about. */
export const PROMPT_NAMES = {
  /** Aarav Dev, the astrologer persona used for readings and chat. */
  ASTROLOGER_PERSONA: 'astrologer_persona',
} as const

export type PromptName = (typeof PROMPT_NAMES)[keyof typeof PROMPT_NAMES]

export interface PromptVersion {
  id: string
  name: string
  version: number
  content: string
  is_active: boolean
  notes: string | null
  created_at: string
}

interface CacheEntry {
  prompt: PromptVersion | null
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

export function invalidatePromptCache(name?: PromptName): void {
  if (name) cache.delete(name)
  else cache.clear()
}

/**
 * The active version of a prompt, or null when none is set.
 * Never throws - a database problem means the caller uses its built-in default.
 */
export async function getActivePrompt(name: PromptName): Promise<PromptVersion | null> {
  const cached = cache.get(name)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.prompt
  }

  let prompt: PromptVersion | null = null

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('prompts')
      .select('id, name, version, content, is_active, notes, created_at')
      .eq('name', name)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    prompt = (data as PromptVersion) ?? null
  } catch (error) {
    console.warn(`[prompts] Could not load "${name}", using built-in default:`, error)
  }

  cache.set(name, { prompt, expiresAt: Date.now() + CACHE_TTL_MS })
  return prompt
}

/**
 * Prompt text with the caller's built-in default as the fallback.
 * Returns the id too, so the answer row can record which version was used.
 */
export async function getPromptText(
  name: PromptName,
  builtInDefault: string
): Promise<{ content: string; promptId: string | null; version: number | null }> {
  const active = await getActivePrompt(name)

  if (!active) {
    return { content: builtInDefault, promptId: null, version: null }
  }

  return { content: active.content, promptId: active.id, version: active.version }
}

/** Every version of a prompt, newest first. */
export async function listPromptVersions(name: PromptName): Promise<PromptVersion[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('prompts')
    .select('id, name, version, content, is_active, notes, created_at')
    .eq('name', name)
    .order('version', { ascending: false })

  if (error) throw new Error(`Could not list versions of "${name}": ${error.message}`)
  return (data ?? []) as PromptVersion[]
}

/**
 * Save a new version and make it active.
 *
 * Versions are never edited in place - an old reading must stay traceable to the
 * exact text that produced it. The previous active version is deactivated first
 * because the database enforces at most one active row per name.
 */
export async function createPromptVersion(
  name: PromptName,
  content: string,
  options: { notes?: string; createdBy?: string; activate?: boolean } = {}
): Promise<PromptVersion> {
  const { notes, createdBy, activate = true } = options

  if (!content.trim()) {
    throw new Error('Prompt content cannot be empty')
  }

  const supabase = createAdminClient()

  const { data: latest } = await supabase
    .from('prompts')
    .select('version')
    .eq('name', name)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (latest?.version ?? 0) + 1

  if (activate) {
    const { error: deactivateError } = await supabase
      .from('prompts')
      .update({ is_active: false })
      .eq('name', name)
      .eq('is_active', true)

    if (deactivateError) {
      throw new Error(`Could not deactivate the previous version: ${deactivateError.message}`)
    }
  }

  const { data, error } = await supabase
    .from('prompts')
    .insert({
      name,
      version: nextVersion,
      content,
      is_active: activate,
      notes: notes ?? null,
      created_by: createdBy ?? null,
    })
    .select('id, name, version, content, is_active, notes, created_at')
    .single()

  if (error) throw new Error(`Could not save the prompt: ${error.message}`)

  invalidatePromptCache(name)
  return data as PromptVersion
}

/** Make an existing version active again - the rollback path. */
export async function activatePromptVersion(name: PromptName, id: string): Promise<void> {
  const supabase = createAdminClient()

  const { error: deactivateError } = await supabase
    .from('prompts')
    .update({ is_active: false })
    .eq('name', name)
    .eq('is_active', true)

  if (deactivateError) {
    throw new Error(`Could not deactivate the current version: ${deactivateError.message}`)
  }

  const { error } = await supabase
    .from('prompts')
    .update({ is_active: true })
    .eq('id', id)
    .eq('name', name)

  if (error) throw new Error(`Could not activate version: ${error.message}`)

  invalidatePromptCache(name)
}
