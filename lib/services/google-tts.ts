/**
 * Google Cloud Text-to-Speech Service
 * Supports 75+ languages including Hindi, Arabic, Russian, Chinese, Korean
 * Free tier: 1 million characters/month (WaveNet) or 4 million (Standard)
 * 
 * Audio files are uploaded to Supabase Storage for production compatibility
 * Documentation: https://cloud.google.com/text-to-speech/docs
 */

import { getVoiceSpec, hasVoice, LANGUAGES } from '@/lib/i18n/registry'

interface GoogleTTSConfig {
    projectId: string
    credentials: any
}

interface VoiceParams {
    languageCode: string
    name?: string // Specific voice name (optional)
    ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL'
}

interface AudioConfig {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS'
    speakingRate?: number // 0.25 to 4.0 (default 1.0)
    pitch?: number // -20.0 to 20.0 (default 0.0)
    volumeGainDb?: number // -96.0 to 16.0
}

/**
 * Voices come from lib/i18n/registry.ts, not from a map kept here. A language
 * with no voice returns null and MUST produce no audio - substituting an English
 * voice hands the listener a reading they cannot understand.
 */
function resolveVoice(language: string): VoiceParams | null {
    const spec = getVoiceSpec(language)
    if (!spec) return null

    return {
        languageCode: spec.locale,
        name: process.env.TTS_VOICE_OVERRIDE || spec.preferredVoice,
        ssmlGender: (process.env.TTS_VOICE_GENDER as VoiceParams['ssmlGender']) || 'FEMALE',
    }
}

/**
 * Standard voices are cheaper and always present where a WaveNet voice exists,
 * so the fallback is derived rather than maintained as a second map.
 */
function toStandardVoice(voice: VoiceParams): VoiceParams {
    return {
        ...voice,
        name: voice.name?.replace(/-(Wavenet|Neural2|Studio)-/, '-Standard-'),
    }
}

/** Speaking rate and pitch are configuration, not constants. */
function audioConfigFromEnv(): { audioEncoding: 'MP3'; speakingRate: number; pitch: number } {
    return {
        audioEncoding: 'MP3',
        speakingRate: parseFloat(process.env.TTS_SPEAKING_RATE || '1.0'),
        pitch: parseFloat(process.env.TTS_PITCH || '0.0'),
    }
}

class GoogleTTSService {
    private credentials: any = null
    private accessToken: string | null = null
    private tokenExpiry: number = 0

    constructor() {
        this.loadCredentials()
    }

    /**
     * Load Google Cloud credentials from environment or file
     */
    private loadCredentials(): void {
        try {
            // Option 1: Try GOOGLE_SERVICE_ACCOUNT_JSON (from Vercel env)
            if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
                this.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
                console.log('[GoogleTTS] ✅ Loaded credentials from GOOGLE_SERVICE_ACCOUNT_JSON')
                return
            }

            // Option 2: Try GOOGLE_APPLICATION_CREDENTIALS file path (for local development)
            const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
            if (credPath) {
                try {
                    // Dynamic import for fs (serverless compatible)
                    const fs = require('fs')
                    const cleanPath = credPath.replace(/"/g, '')
                    if (fs.existsSync(cleanPath)) {
                        this.credentials = JSON.parse(fs.readFileSync(cleanPath, 'utf-8'))
                        console.log('[GoogleTTS] ✅ Loaded credentials from file:', cleanPath)
                        return
                    }
                } catch (fsError) {
                    // fs not available (edge runtime), skip file loading
                    console.log('[GoogleTTS] ℹ️ File system not available, using env vars only')
                }
            }

            console.warn('[GoogleTTS] ⚠️ No Google Cloud credentials found. TTS will not work.')
        } catch (error) {
            console.error('[GoogleTTS] ❌ Error loading credentials:', error)
        }
    }

    /**
     * Check if Google TTS is available
     */
    isAvailable(): boolean {
        return this.credentials !== null
    }

    /**
     * Get OAuth2 access token for Google Cloud API
     */
    private async getAccessToken(): Promise<string> {
        // Return cached token if still valid (with 5 min buffer)
        if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
            return this.accessToken
        }

        if (!this.credentials) {
            throw new Error('Google Cloud credentials not configured')
        }

        // Create JWT for service account authentication
        const jwt = await this.createJWT()

        // Exchange JWT for access token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to get access token: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        this.accessToken = data.access_token
        this.tokenExpiry = Date.now() + (data.expires_in * 1000)

        return this.accessToken!
    }

    /**
     * Create a JWT for service account authentication
     */
    private async createJWT(): Promise<string> {
        const header = {
            alg: 'RS256',
            typ: 'JWT',
        }

        const now = Math.floor(Date.now() / 1000)
        const payload = {
            iss: this.credentials.client_email,
            sub: this.credentials.client_email,
            aud: 'https://oauth2.googleapis.com/token',
            iat: now,
            exp: now + 3600, // 1 hour
            scope: 'https://www.googleapis.com/auth/cloud-platform',
        }

        // Base64url encode header and payload
        const encodedHeader = this.base64urlEncode(JSON.stringify(header))
        const encodedPayload = this.base64urlEncode(JSON.stringify(payload))
        const signatureInput = `${encodedHeader}.${encodedPayload}`

        // Sign with RSA private key
        const signature = await this.signRS256(signatureInput, this.credentials.private_key)

        return `${signatureInput}.${signature}`
    }

    /**
     * Base64url encode a string
     */
    private base64urlEncode(str: string): string {
        const base64 = Buffer.from(str).toString('base64')
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    }

    /**
     * Sign data with RS256 using the private key
     */
    private async signRS256(data: string, privateKey: string): Promise<string> {
        const crypto = await import('crypto')
        const sign = crypto.createSign('RSA-SHA256')
        sign.update(data)
        const signature = sign.sign(privateKey, 'base64')
        return signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    }

    /**
     * Get voice parameters for a language
     */
    private getVoiceParams(language: string): VoiceParams | null {
        return resolveVoice(language)
    }

    /**
     * Generate speech audio from text
     * @param text Text to convert to speech
     * @param language Language code (e.g., 'hi', 'ar', 'ru', 'zh', 'ko')
     * @returns Base64 encoded audio content
     */
    async generateSpeech(text: string, language: string = 'en'): Promise<string> {
        if (!this.isAvailable()) {
            throw new Error('Google Cloud TTS is not configured. Please set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON.')
        }

        const accessToken = await this.getAccessToken()
        const voiceParams = this.getVoiceParams(language)

        if (!voiceParams) {
            // Deliberate: the caller checks isLanguageSupported() first and skips
            // audio entirely. Reaching here means that check was missed.
            throw new Error(
                `No Google TTS voice exists for language "${language}". ` +
                'Audio must be skipped rather than generated in another language.'
            )
        }

        // Clean and prepare text
        const cleanText = text
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        if (!cleanText) {
            throw new Error('Text cannot be empty')
        }

        // Google TTS has a 5000 byte limit per request
        // For non-Latin scripts, each character can be 3-4 bytes
        const maxChars = 4500 // Safe limit
        const truncatedText = cleanText.length > maxChars
            ? cleanText.substring(0, maxChars) + '...'
            : cleanText

        console.log(`[GoogleTTS] 🎤 Generating speech for language: ${language} (${voiceParams.languageCode})`)
        console.log(`[GoogleTTS] 📝 Text length: ${truncatedText.length} characters`)

        const requestBody = {
            input: {
                text: truncatedText,
            },
            voice: {
                languageCode: voiceParams.languageCode,
                name: voiceParams.name,
                ssmlGender: voiceParams.ssmlGender,
            },
            audioConfig: audioConfigFromEnv(),
        }

        try {
            const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                console.error('[GoogleTTS] ❌ API Error:', errorData)

                // Try fallback to Standard voice if WaveNet fails
                if (voiceParams.name?.includes('Wavenet')) {
                    console.log('[GoogleTTS] 🔄 Trying fallback to Standard voice...')
                    return this.generateSpeechWithFallback(truncatedText, language)
                }

                throw new Error(`Google TTS API error: ${response.status} - ${JSON.stringify(errorData)}`)
            }

            const data = await response.json()
            console.log('[GoogleTTS] ✅ Speech generated successfully')

            return data.audioContent // Base64 encoded audio
        } catch (error) {
            console.error('[GoogleTTS] ❌ Error generating speech:', error)
            throw error
        }
    }

    /**
     * Fallback to Standard voices if WaveNet fails
     */
    private async generateSpeechWithFallback(text: string, language: string): Promise<string> {
        const accessToken = await this.getAccessToken()
        const primary = resolveVoice(language)

        if (!primary) {
            throw new Error(`No Google TTS voice exists for language "${language}".`)
        }

        const voiceParams = toStandardVoice(primary)

        const requestBody = {
            input: { text },
            voice: {
                languageCode: voiceParams.languageCode,
                // Omitting the name lets Google pick any voice for the locale, so a
                // stale voice name degrades instead of failing the whole reading.
                name: voiceParams.name,
                ssmlGender: voiceParams.ssmlGender,
            },
            audioConfig: audioConfigFromEnv(),
        }

        const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`Google TTS fallback error: ${response.status} - ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        console.log('[GoogleTTS] ✅ Speech generated with Standard voice (fallback)')
        return data.audioContent
    }

    /**
     * Generate speech and upload to Supabase Storage
     * This works in production (Vercel) where local file system is read-only
     * @param text Text to convert
     * @param language Language code
     * @param filename Optional filename (without extension)
     * @returns Public URL to the audio file
     */
    async generateSpeechFile(text: string, language: string = 'en', filename?: string): Promise<string> {
        const audioContent = await this.generateSpeech(text, language)

        // Generate filename
        const fileName = filename || `tts_${Date.now()}_${Math.random().toString(36).substring(7)}`
        const fullFileName = `${fileName}.mp3`

        // Decode base64 to buffer
        const audioBuffer = Buffer.from(audioContent, 'base64')

        try {
            // Import Supabase client dynamically to avoid circular dependencies
            const { createClient } = await import('@/lib/supabase/server')
            const supabase = await createClient()

            // Upload to Supabase Storage (audio-files bucket)
            const storagePath = `voice-narration/${fullFileName}`

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('audio-files')
                .upload(storagePath, audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true,
                })

            if (uploadError) {
                console.error('[GoogleTTS] ❌ Supabase upload error:', uploadError)

                // Fallback: Try to save locally (for development)
                if (process.env.NODE_ENV === 'development') {
                    const fs = await import('fs')
                    const path = await import('path')
                    const localPath = path.join(process.cwd(), 'public', 'audio', fullFileName)

                    // Ensure directory exists
                    const audioDir = path.dirname(localPath)
                    if (!fs.existsSync(audioDir)) {
                        fs.mkdirSync(audioDir, { recursive: true })
                    }

                    fs.writeFileSync(localPath, audioBuffer)
                    console.log(`[GoogleTTS] 💾 Saved locally (fallback): ${localPath}`)
                    return `/audio/${fullFileName}`
                }

                throw new Error(`Failed to upload audio: ${uploadError.message}`)
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('audio-files')
                .getPublicUrl(storagePath)

            const publicUrl = publicUrlData?.publicUrl

            if (!publicUrl) {
                throw new Error('Failed to get public URL for audio file')
            }

            console.log(`[GoogleTTS] ☁️ Uploaded to Supabase Storage: ${publicUrl}`)
            return publicUrl

        } catch (error) {
            console.error('[GoogleTTS] ❌ Error uploading to Supabase:', error)

            // For development, try local fallback
            if (process.env.NODE_ENV === 'development') {
                const fs = await import('fs')
                const path = await import('path')
                const localPath = path.join(process.cwd(), 'public', 'audio', fullFileName)

                const audioDir = path.dirname(localPath)
                if (!fs.existsSync(audioDir)) {
                    fs.mkdirSync(audioDir, { recursive: true })
                }

                fs.writeFileSync(localPath, audioBuffer)
                console.log(`[GoogleTTS] 💾 Saved locally (dev fallback): ${localPath}`)
                return `/audio/${fullFileName}`
            }

            throw error
        }
    }

    /**
     * Generate a data URL for the audio (for direct embedding)
     * Useful for email or API responses
     */
    async generateSpeechDataUrl(text: string, language: string = 'en'): Promise<string> {
        const audioContent = await this.generateSpeech(text, language)
        return `data:audio/mp3;base64,${audioContent}`
    }

    /**
     * Get list of supported languages
     */
    getSupportedLanguages(): string[] {
        return LANGUAGES.filter((l) => l.tts !== null).map((l) => l.code)
    }

    /**
     * Check if a language is supported
     */
    isLanguageSupported(language: string): boolean {
        return hasVoice(language)
    }
}

// Export singleton instance
export const googleTTSService = new GoogleTTSService()
