/**
 * POST /api/questions/transcribe
 *
 * Turns a spoken question into text so the user can ask by voice instead of
 * typing. Accepts multipart/form-data with an `audio` file.
 *
 * Returns the transcript for the user to review and edit before submitting -
 * the question is never sent onward from here. A misheard question would
 * otherwise produce a reading about the wrong thing.
 */

import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import {
  isAcceptedAudioType,
  isTranscriptionAvailable,
  MAX_AUDIO_BYTES,
  transcribe,
} from '@/lib/services/stt'

export async function GET() {
  // The client asks whether to show the microphone button at all. Only ever
  // called from an authenticated page, so it authenticates too.
  const user = await getAuthenticatedUser()
  if (!user) {
    return createErrorResponse('Unauthorized', 401)
  }

  return createSuccessResponse({ available: isTranscriptionAvailable() })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    if (!isTranscriptionAvailable()) {
      return createErrorResponse(
        'Voice questions are not available right now. Please type your question.',
        503
      )
    }

    const formData = await request.formData().catch(() => null)
    if (!formData) {
      return createErrorResponse('Send the recording as multipart/form-data', 400)
    }

    const file = formData.get('audio')
    if (!(file instanceof File)) {
      return createErrorResponse('No recording was included', 400)
    }

    if (file.size === 0) {
      return createErrorResponse('The recording was empty. Please try again.', 400)
    }

    // Checked before reading the body into memory.
    if (file.size > MAX_AUDIO_BYTES) {
      return createErrorResponse(
        'That recording is too long. Please keep questions under a few minutes.',
        413
      )
    }

    const mimeType = file.type || 'audio/webm'
    if (!isAcceptedAudioType(mimeType)) {
      return createErrorResponse(`Unsupported audio format: ${mimeType}`, 415)
    }

    // Transcribe in the user's preferred language unless the provider detects
    // otherwise. A Kannada speaker gets Kannada text without choosing anything.
    const supabase = await createClient()
    const { data: userRow } = await supabase
      .from('users')
      .select('preferred_language')
      .eq('id', user.id)
      .single()

    const audio = Buffer.from(await file.arrayBuffer())

    const result = await transcribe({
      audio,
      mimeType,
      languageHint: userRow?.preferred_language ?? user.preferred_language ?? undefined,
    })

    return createSuccessResponse({
      text: result.text,
      language: result.language,
      provider: result.provider,
      confidence: result.confidence,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not transcribe the recording'
    console.error('Error in POST /api/questions/transcribe:', error)

    // These messages are written for the user, not for a log.
    return createErrorResponse(message, 500)
  }
}
