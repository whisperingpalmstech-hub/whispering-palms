/**
 * Speech-to-text, so users can ask their question by voice instead of typing.
 *
 * Mirrors lib/services/tts: one interface, providers behind it, selection by
 * configuration. Two providers ship:
 *
 *   whisper  OpenAI. Detects the spoken language itself, which matters here -
 *            a Kannada speaker should not have to pick "Kannada" from a menu
 *            before they can talk. Preferred when OPENAI_API_KEY is set.
 *   google   Google Cloud Speech-to-Text. Needs a locale up front, so it is
 *            given the user's preferred language and told to expect that.
 *
 * Both return the transcript plus the language actually detected, so the
 * reading can be answered in the language the question was asked in.
 */

import { getLanguage, getVoiceSpec, resolveLanguage } from '@/lib/i18n/registry'

export type STTProviderName = 'whisper' | 'google'

export interface TranscriptionRequest {
  /** Raw audio bytes as captured by the browser. */
  audio: Buffer
  /** MIME type from the recorder, e.g. 'audio/webm;codecs=opus'. */
  mimeType: string
  /**
   * The user's preferred language, used as a hint. Providers that detect
   * language themselves may return something else, and that answer wins.
   */
  languageHint?: string
}

export interface TranscriptionResult {
  text: string
  /** Registry language code the audio was actually spoken in. */
  language: string
  provider: STTProviderName
  /** 0-1 where the provider reports one. */
  confidence: number | null
}

export interface STTProvider {
  readonly name: STTProviderName
  isConfigured(): boolean
  transcribe(request: TranscriptionRequest): Promise<TranscriptionResult>
}

/** Browsers record webm/opus or mp4/aac; anything else is rejected up front. */
export const ACCEPTED_AUDIO_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
] as const

/** 10 MB is roughly ten minutes of opus - far more than a spoken question. */
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024

export function isAcceptedAudioType(mimeType: string): boolean {
  const base = mimeType.split(';')[0].trim().toLowerCase()
  return (ACCEPTED_AUDIO_TYPES as readonly string[]).includes(base)
}

function extensionFor(mimeType: string): string {
  const base = mimeType.split(';')[0].trim().toLowerCase()
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-m4a': 'm4a',
  }
  return map[base] ?? 'webm'
}

// ---------------------------------------------------------------------------
// Whisper
// ---------------------------------------------------------------------------

const whisperProvider: STTProvider = {
  name: 'whisper',

  isConfigured: () => !!process.env.OPENAI_API_KEY,

  async transcribe({ audio, mimeType, languageHint }) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

    const form = new FormData()
    form.append(
      'file',
      new Blob([new Uint8Array(audio)], { type: mimeType }),
      `question.${extensionFor(mimeType)}`
    )
    form.append('model', process.env.STT_WHISPER_MODEL || 'whisper-1')
    // verbose_json is what carries the detected language back.
    form.append('response_format', 'verbose_json')

    // Only pass the hint when we actually know it. Forcing a language makes
    // Whisper transliterate rather than admit it heard something else.
    if (languageHint && getLanguage(languageHint)) {
      form.append('language', languageHint)
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Whisper error ${response.status}: ${detail.slice(0, 300)}`)
    }

    const data = (await response.json()) as { text?: string; language?: string }

    return {
      text: (data.text ?? '').trim(),
      // Whisper reports English names ("kannada"), not codes.
      language: normalizeDetectedLanguage(data.language, languageHint),
      provider: 'whisper',
      confidence: null,
    }
  },
}

/** Map Whisper's English language name back to a registry code. */
function normalizeDetectedLanguage(detected: string | undefined, fallback?: string): string {
  if (!detected) return resolveLanguage(fallback)

  const value = detected.trim().toLowerCase()

  // Already a code.
  const direct = getLanguage(value)
  if (direct) return direct.code

  // Otherwise match on the English name from the registry.
  const { LANGUAGES } = require('@/lib/i18n/registry') as typeof import('@/lib/i18n/registry')
  const byName = LANGUAGES.find((l) => l.name.toLowerCase() === value)
  if (byName) return byName.code

  return resolveLanguage(fallback)
}

// ---------------------------------------------------------------------------
// Google Cloud Speech-to-Text
// ---------------------------------------------------------------------------

function googleEncodingFor(mimeType: string): string | null {
  const base = mimeType.split(';')[0].trim().toLowerCase()
  if (base === 'audio/webm' || base === 'audio/ogg') return 'WEBM_OPUS'
  if (base === 'audio/wav') return 'LINEAR16'
  if (base === 'audio/mpeg') return 'MP3'
  // MP4/AAC has no v1 encoding constant; let Google infer from the header.
  return null
}

const googleProvider: STTProvider = {
  name: 'google',

  isConfigured: () =>
    !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS),

  async transcribe({ audio, mimeType, languageHint }) {
    // Reuse the TTS service's service-account token handling rather than
    // duplicating JWT signing.
    const { googleTTSService } = await import('@/lib/services/google-tts')
    const accessToken = await (googleTTSService as unknown as {
      getAccessToken(): Promise<string>
    }).getAccessToken()

    const language = resolveLanguage(languageHint)
    // Google needs a BCP-47 locale; the registry already carries one per
    // language for TTS, and the same locale works for recognition.
    const locale = getVoiceSpec(language)?.locale ?? 'en-US'
    const encoding = googleEncodingFor(mimeType)

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            ...(encoding ? { encoding } : {}),
            languageCode: locale,
            enableAutomaticPunctuation: true,
            model: 'latest_long',
          },
          audio: { content: audio.toString('base64') },
        }),
      }
    )

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Google STT error ${response.status}: ${detail.slice(0, 300)}`)
    }

    const data = (await response.json()) as {
      results?: Array<{ alternatives?: Array<{ transcript?: string; confidence?: number }> }>
    }

    const alternatives = (data.results ?? []).flatMap((r) => r.alternatives ?? [])
    const text = alternatives.map((a) => a.transcript ?? '').join(' ').trim()
    const confidence = alternatives[0]?.confidence ?? null

    return { text, language, provider: 'google', confidence }
  },
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

function getProviderOrder(): STTProvider[] {
  const pinned = process.env.STT_PROVIDER?.toLowerCase().trim()

  if (pinned === 'none') return []
  if (pinned === 'whisper') return [whisperProvider]
  if (pinned === 'google') return [googleProvider]

  // Whisper first: it detects the spoken language, so the user never has to
  // declare it before speaking.
  return [whisperProvider, googleProvider]
}

/** True when voice questions can be offered at all. */
export function isTranscriptionAvailable(): boolean {
  return getProviderOrder().some((p) => p.isConfigured())
}

/**
 * Transcribe a spoken question.
 * Throws when no provider is configured, or when every configured one failed -
 * the caller turns that into a message telling the user to type instead.
 */
export async function transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
  if (request.audio.length === 0) {
    throw new Error('The recording was empty. Please try again.')
  }

  if (request.audio.length > MAX_AUDIO_BYTES) {
    throw new Error('That recording is too long. Please keep questions under a few minutes.')
  }

  if (!isAcceptedAudioType(request.mimeType)) {
    throw new Error(`Unsupported audio format: ${request.mimeType}`)
  }

  const usable = getProviderOrder().filter((p) => p.isConfigured())

  if (usable.length === 0) {
    throw new Error('Voice questions are not available right now. Please type your question.')
  }

  let lastError: unknown = null

  for (const provider of usable) {
    try {
      const result = await provider.transcribe(request)

      if (!result.text) {
        // Empty transcript is a real outcome, not an error: silence, or audio
        // the model could not make out. Try the next provider before giving up.
        lastError = new Error('No speech was detected in the recording.')
        continue
      }

      console.log(`[STT] ✅ ${provider.name} transcribed ${result.text.length} chars (${result.language})`)
      return result
    } catch (error) {
      lastError = error
      console.error(`[STT] ${provider.name} failed:`, error)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not transcribe the recording.')
}

/** Non-secret status for the admin console. */
export function getSTTStatus() {
  return {
    pinned: process.env.STT_PROVIDER || null,
    available: isTranscriptionAvailable(),
    providers: getProviderOrder().map((p) => ({
      name: p.name,
      configured: p.isConfigured(),
    })),
  }
}
