/**
 * Text-to-speech provider layer.
 *
 * Same shape as lib/services/mailer.ts: one interface, providers behind it,
 * selection by configuration rather than by an if/else in a route handler.
 *
 * The important rule this layer enforces:
 *
 *   A language with no voice produces NO audio.
 *
 * The previous inline logic fell back to an English voice whenever a language
 * was unsupported, so a Kannada reader received their reading spoken in English
 * with no indication anything had gone wrong. `synthesize()` returns null
 * instead, and the caller sends the reading without audio.
 */

import { getLanguage, getVoiceSpec, hasVoice } from '@/lib/i18n/registry'
import { googleTTSService } from '@/lib/services/google-tts'
import { voiceRSSTTSService } from '@/lib/services/voicerss-tts'

export type TTSProviderName = 'google' | 'voicerss' | 'none'

export interface SynthesisRequest {
  text: string
  /** Registry language code, e.g. 'kn'. */
  language: string
}

export interface SynthesisResult {
  /** Public URL to the generated audio. */
  audioUrl: string
  provider: TTSProviderName
  /** The language actually spoken. Always equals the requested language. */
  language: string
}

export interface TTSProvider {
  readonly name: TTSProviderName
  /** True when credentials are present. */
  isConfigured(): boolean
  /** True when this provider can speak this language. */
  supports(language: string): boolean
  /** Produce audio and return a public URL. */
  synthesize(request: SynthesisRequest): Promise<string>
}

const googleProvider: TTSProvider = {
  name: 'google',
  isConfigured: () => googleTTSService.isAvailable(),
  supports: (language) => hasVoice(language),
  synthesize: ({ text, language }) => googleTTSService.generateSpeechFile(text, language),
}

const voiceRSSProvider: TTSProvider = {
  name: 'voicerss',
  isConfigured: () => voiceRSSTTSService.isAvailable(),
  // VoiceRSS is only wired up for English here; it exists as a stopgap for when
  // Google credentials are missing, not as a general-purpose provider.
  supports: (language) => language === 'en',
  synthesize: ({ text }) => voiceRSSTTSService.generateSpeechUrlAsync(text, 'en-us'),
}

const PROVIDERS: Record<Exclude<TTSProviderName, 'none'>, TTSProvider> = {
  google: googleProvider,
  voicerss: voiceRSSProvider,
}

/**
 * Provider order. TTS_PROVIDER pins one; otherwise Google is tried first and
 * VoiceRSS picks up English if Google is unconfigured.
 */
function getProviderOrder(): TTSProvider[] {
  const pinned = process.env.TTS_PROVIDER?.toLowerCase().trim()

  if (pinned === 'none') return []
  if (pinned === 'google') return [googleProvider]
  if (pinned === 'voicerss') return [voiceRSSProvider]

  return [googleProvider, voiceRSSProvider]
}

/**
 * True when audio can be produced in this language by some configured provider.
 * Check this before promising a user voice narration.
 */
export function canSynthesize(language: string): boolean {
  return getProviderOrder().some((p) => p.isConfigured() && p.supports(language))
}

/**
 * Produce audio for a reading.
 *
 * Returns null - never English audio - when no configured provider speaks the
 * language. Callers send the reading without audio in that case.
 * Throws only when a provider that claimed support then failed.
 */
export async function synthesize(request: SynthesisRequest): Promise<SynthesisResult | null> {
  const { text, language } = request
  const entry = getLanguage(language)

  if (!entry) {
    console.warn(`[TTS] Unknown language "${language}" - skipping audio.`)
    return null
  }

  if (!text.trim()) {
    console.warn('[TTS] Empty text - skipping audio.')
    return null
  }

  const candidates = getProviderOrder()
  const usable = candidates.filter((p) => p.isConfigured() && p.supports(language))

  if (usable.length === 0) {
    const configured = candidates.filter((p) => p.isConfigured()).map((p) => p.name)

    if (configured.length === 0) {
      console.warn('[TTS] No provider is configured - skipping audio.')
    } else if (!entry.tts) {
      console.warn(
        `[TTS] ${entry.name} (${language}) has no voice. Sending the reading without audio ` +
        'rather than speaking it in another language.'
      )
    } else {
      console.warn(`[TTS] No configured provider speaks ${language}. Configured: ${configured.join(', ')}`)
    }
    return null
  }

  let lastError: unknown = null

  for (const provider of usable) {
    try {
      const audioUrl = await provider.synthesize({ text, language })
      console.log(`[TTS] ✅ ${entry.name} (${language}) via ${provider.name}`)
      return { audioUrl, provider: provider.name, language }
    } catch (error) {
      lastError = error
      console.error(`[TTS] ${provider.name} failed for ${language}:`, error)
    }
  }

  // Every provider that claimed the language failed. Surface it - this is a
  // real fault, not the benign "no voice for this language" case above.
  throw lastError instanceof Error
    ? lastError
    : new Error(`All TTS providers failed for language "${language}"`)
}

/** Non-secret status summary for logs, health checks and the admin console. */
export function getTTSStatus() {
  const order = getProviderOrder()

  return {
    pinned: process.env.TTS_PROVIDER || null,
    speakingRate: parseFloat(process.env.TTS_SPEAKING_RATE || '1.0'),
    pitch: parseFloat(process.env.TTS_PITCH || '0.0'),
    gender: process.env.TTS_VOICE_GENDER || 'FEMALE',
    providers: order.map((p) => ({
      name: p.name,
      configured: p.isConfigured(),
    })),
  }
}

export { getVoiceSpec }
