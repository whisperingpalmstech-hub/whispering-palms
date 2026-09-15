/**
 * Runtime configuration.
 *
 * Reads app_settings, falling back to the matching environment variable when a
 * key has no row. That fallback is the whole design: deploying the settings
 * table changes nothing until someone actually sets a value, and if the database
 * is unreachable the app keeps running on its environment config.
 *
 * Values are cached briefly so a hot path does not query per request.
 */

import { createAdminClient } from '@/lib/supabase/admin'

/** Every configurable key, its environment fallback, and what it does. */
export const SETTING_DEFINITIONS = {
  'tts.provider': {
    env: 'TTS_PROVIDER',
    description: 'Which TTS provider to use: google, voicerss, or none.',
    fallback: null as string | null,
  },
  'tts.speakingRate': {
    env: 'TTS_SPEAKING_RATE',
    description: 'Speech speed, 0.25 to 4.0. 1.0 is normal.',
    fallback: '1.0' as string | null,
  },
  'tts.pitch': {
    env: 'TTS_PITCH',
    description: 'Voice pitch, -20.0 to 20.0. 0 is normal.',
    fallback: '0.0' as string | null,
  },
  'tts.voiceGender': {
    env: 'TTS_VOICE_GENDER',
    description: 'Default voice gender: MALE, FEMALE or NEUTRAL.',
    fallback: 'FEMALE' as string | null,
  },
  'stt.provider': {
    env: 'STT_PROVIDER',
    description: 'Speech-to-text provider for voice questions: whisper, google, or none.',
    fallback: null as string | null,
  },
  'llm.provider': {
    env: 'USE_OLLAMA',
    description: 'LLM backend. "true" selects Ollama, otherwise OpenAI.',
    fallback: null as string | null,
  },
  'llm.model': {
    env: 'OPENAI_MODEL',
    description: 'Model name for the active LLM provider.',
    fallback: 'gpt-4o-mini' as string | null,
  },
  'translation.provider': {
    env: 'TRANSLATION_PROVIDER',
    description: 'Translation backend: llm, libretranslate or mymemory.',
    fallback: 'llm' as string | null,
  },
  'email.provider': {
    env: 'EMAIL_PROVIDER',
    description: 'Outbound mail relay: zeptomail, smtp, zoho, resend or gmail.',
    fallback: null as string | null,
  },
} as const

export type SettingKey = keyof typeof SETTING_DEFINITIONS

interface CacheEntry {
  value: string | null
  expiresAt: number
}

const CACHE_TTL_MS = 30_000
const cache = new Map<string, CacheEntry>()

/** Drop the cache so an admin edit takes effect on the next read. */
export function invalidateConfigCache(key?: SettingKey): void {
  if (key) cache.delete(key)
  else cache.clear()
}

function envFallback(key: SettingKey): string | null {
  const def = SETTING_DEFINITIONS[key]
  return process.env[def.env] ?? def.fallback
}

/**
 * Read one setting.
 * Never throws - a database problem falls through to the environment value.
 */
export async function getSetting(key: SettingKey): Promise<string | null> {
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value
  }

  let value: string | null = null

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()

    if (error) throw error

    if (data?.value !== undefined && data.value !== null) {
      // Stored as JSONB, so a plain string arrives already parsed.
      value = typeof data.value === 'string' ? data.value : JSON.stringify(data.value)
    }
  } catch (error) {
    // Deliberate: configuration must never take the app down.
    console.warn(`[config] Could not read "${key}" from app_settings, using environment:`, error)
  }

  const resolved = value ?? envFallback(key)
  cache.set(key, { value: resolved, expiresAt: Date.now() + CACHE_TTL_MS })
  return resolved
}

/** Read a setting as a number, falling back when it is unset or unparseable. */
export async function getNumericSetting(key: SettingKey, fallback: number): Promise<number> {
  const raw = await getSetting(key)
  if (raw === null) return fallback
  const parsed = parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** Every setting with its current value and where that value came from. */
export async function getAllSettings(): Promise<
  Array<{
    key: SettingKey
    value: string | null
    source: 'database' | 'environment' | 'default'
    env: string
    description: string
  }>
> {
  let rows: Record<string, unknown> = {}

  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('app_settings').select('key, value')
    for (const row of data ?? []) {
      rows[row.key as string] = row.value
    }
  } catch (error) {
    console.warn('[config] Could not list app_settings:', error)
  }

  return (Object.keys(SETTING_DEFINITIONS) as SettingKey[]).map((key) => {
    const def = SETTING_DEFINITIONS[key]
    const dbValue = rows[key]

    if (dbValue !== undefined && dbValue !== null) {
      return {
        key,
        value: typeof dbValue === 'string' ? dbValue : JSON.stringify(dbValue),
        source: 'database' as const,
        env: def.env,
        description: def.description,
      }
    }

    if (process.env[def.env] !== undefined) {
      return {
        key,
        value: process.env[def.env] ?? null,
        source: 'environment' as const,
        env: def.env,
        description: def.description,
      }
    }

    return {
      key,
      value: def.fallback,
      source: 'default' as const,
      env: def.env,
      description: def.description,
    }
  })
}

/** Write a setting. Passing null deletes the row, reverting to the environment. */
export async function setSetting(
  key: SettingKey,
  value: string | null,
  updatedBy?: string
): Promise<void> {
  if (!(key in SETTING_DEFINITIONS)) {
    throw new Error(`Unknown setting key: ${key}`)
  }

  const supabase = createAdminClient()

  if (value === null) {
    const { error } = await supabase.from('app_settings').delete().eq('key', key)
    if (error) throw new Error(`Could not clear "${key}": ${error.message}`)
  } else {
    const { error } = await supabase.from('app_settings').upsert(
      {
        key,
        value,
        description: SETTING_DEFINITIONS[key].description,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy ?? null,
      },
      { onConflict: 'key' }
    )
    if (error) throw new Error(`Could not save "${key}": ${error.message}`)
  }

  invalidateConfigCache(key)
}
