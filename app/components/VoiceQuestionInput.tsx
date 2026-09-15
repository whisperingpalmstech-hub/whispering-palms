'use client'

/**
 * Microphone button for asking a question by voice.
 *
 * Records with MediaRecorder, uploads to /api/questions/transcribe, and hands
 * the transcript back to the caller. The transcript lands in the normal
 * question box for the user to read and correct before submitting - a misheard
 * question would otherwise produce a reading about something they never asked.
 *
 * Renders nothing when transcription is unconfigured or the browser cannot
 * record, so the typed flow is never disturbed.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface VoiceQuestionInputProps {
  /** Called with the transcript once the recording is understood. */
  onTranscript: (text: string) => void
  disabled?: boolean
}

type State = 'idle' | 'recording' | 'transcribing'

/** Longest single recording. Beyond this the upload gets slow and costly. */
const MAX_SECONDS = 120

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null

  // Ordered by what the transcription providers handle best.
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}

export default function VoiceQuestionInput({ onTranscript, disabled }: VoiceQuestionInputProps) {
  const [supported, setSupported] = useState(false)
  const [available, setAvailable] = useState(false)
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const canRecord =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      pickMimeType() !== null

    setSupported(canRecord)

    if (!canRecord) return

    // Don't offer a microphone the server cannot act on.
    fetch('/api/questions/transcribe')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAvailable(!!j?.data?.available))
      .catch(() => setAvailable(false))
  }, [])

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
    setSeconds(0)
  }, [])

  // Release the microphone if the page unmounts mid-recording.
  useEffect(() => cleanup, [cleanup])

  const upload = useCallback(
    async (blob: Blob, mimeType: string) => {
      setState('transcribing')
      try {
        const form = new FormData()
        form.append('audio', blob, 'question.webm')

        const response = await fetch('/api/questions/transcribe', {
          method: 'POST',
          body: form,
        })

        const json = await response.json()

        if (!response.ok) {
          throw new Error(json.error?.message ?? 'Could not understand the recording')
        }

        const text = String(json.data?.text ?? '').trim()
        if (!text) {
          throw new Error('No speech was detected. Please try again.')
        }

        onTranscript(text)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not understand the recording')
      } finally {
        setState('idle')
      }
    },
    [onTranscript]
  )

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [])

  const start = useCallback(async () => {
    setError(null)

    const mimeType = pickMimeType()
    if (!mimeType) {
      setError('This browser cannot record audio. Please type your question.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        cleanup()
        if (blob.size > 0) void upload(blob, mimeType)
        else setState('idle')
      }

      recorder.start()
      setState('recording')

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop()
          return s + 1
        })
      }, 1000)
    } catch (e) {
      cleanup()
      setState('idle')
      // The common case by far is the user declining the permission prompt.
      const name = e instanceof DOMException ? e.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Microphone access was blocked. Allow it in your browser, or type your question.')
      } else if (name === 'NotFoundError') {
        setError('No microphone was found. Please type your question.')
      } else {
        setError('Could not start recording. Please type your question.')
      }
    }
  }, [cleanup, stop, upload])

  if (!supported || !available) return null

  const busy = disabled || state === 'transcribing'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={state === 'recording' ? stop : start}
          disabled={busy}
          aria-label={state === 'recording' ? 'Stop recording' : 'Ask your question by voice'}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            state === 'recording'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-white/80 hover:bg-white border border-beige-300 text-text-primary'
          }`}
        >
          {state === 'recording' ? (
            <>
              <span className="w-2.5 h-2.5 rounded-sm bg-white animate-pulse" aria-hidden="true" />
              Stop · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
            </>
          ) : state === 'transcribing' ? (
            <>
              <svg className="animate-spin h-4 w-4 text-gold-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Listening back…
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-14 0m7 7v4m-4 0h8M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z" />
              </svg>
              Speak your question
            </>
          )}
        </button>

        {state === 'recording' && (
          <span className="text-xs text-text-tertiary">
            Stops on its own after {MAX_SECONDS / 60} minutes
          </span>
        )}
      </div>

      {state === 'transcribing' && (
        <p className="text-xs text-text-tertiary">
          You will be able to read and edit the text before sending it.
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
