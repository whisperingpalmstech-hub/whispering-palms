'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/app/hooks/useI18n'

type State =
  | { status: 'loading' }
  | { status: 'ready'; url: string; fromCache: boolean }
  | { status: 'no-palm' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string }

/**
 * The user's own palm with its lines traced — the thing they screenshot.
 *
 * The first load after an upload takes ~25s (a real image-model call), so
 * the loading state says what is happening rather than showing a bare
 * spinner. Every later load is a cache hit and instant.
 */
export default function PalmLinesCard() {
  const { t } = useI18n()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)

    ;(async () => {
      try {
        const res = await fetch('/api/palm-trace')
        if (cancelled) return
        if (res.status === 404) return setState({ status: 'no-palm' })
        if (res.status === 503) return setState({ status: 'unavailable' })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          return setState({
            status: 'error',
            message: body?.error?.message || t('palmLines.error'),
          })
        }
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        setState({
          status: 'ready',
          url: objectUrl,
          fromCache: res.headers.get('X-Palm-Cache') === 'hit',
        })
      } catch {
        if (!cancelled) setState({ status: 'error', message: t('palmLines.error') })
      } finally {
        clearInterval(timer)
      }
    })()

    return () => {
      cancelled = true
      clearInterval(timer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Nothing to show until a palm exists; the upload card already covers that.
  if (state.status === 'no-palm' || state.status === 'unavailable') return null

  const download = () => {
    if (state.status !== 'ready') return
    const a = document.createElement('a')
    a.href = state.url
    a.download = 'my-palm-lines.png'
    a.click()
  }

  const share = async () => {
    if (state.status !== 'ready') return
    try {
      const blob = await (await fetch(state.url)).blob()
      const file = new File([blob], 'my-palm-lines.png', { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: t('palmLines.shareTitle') })
        return
      }
    } catch {
      /* fall through to download */
    }
    download()
  }

  return (
    <div className="group relative bg-gradient-to-br from-sage-100 via-beige-100 to-sage-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-sage-300 hover:border-sage-500 shadow-soft-xl transition-all duration-700 overflow-hidden">
      <div className="absolute -inset-1 bg-gradient-to-r from-sage-400 to-gold-400 rounded-3xl opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-700"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 sm:gap-5 mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 bg-gradient-to-br from-sage-500 to-sage-600 rounded-xl sm:rounded-2xl shadow-soft-xl flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-1">{t('palmLines.title')}</h3>
            <p className="text-text-secondary text-xs sm:text-sm">{t('palmLines.subtitle')}</p>
          </div>
        </div>

        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 border-4 border-sage-300 border-t-sage-600 rounded-full animate-spin mb-4" />
            <p className="text-text-primary font-medium">{t('palmLines.reading')}</p>
            <p className="text-text-secondary text-xs mt-1">
              {elapsed < 8 ? t('palmLines.readingHint') : t('palmLines.readingLong')}
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <p className="text-red-700 text-sm py-6 text-center">{state.message}</p>
        )}

        {state.status === 'ready' && (
          <>
            <div className="rounded-xl overflow-hidden shadow-soft-xl bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.url} alt={t('palmLines.alt')} className="w-full h-auto block" />
            </div>
            <div className="flex flex-wrap gap-3 mt-4 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-pink-400 shadow-[0_0_8px_#f472b6]" />{t('palmLines.heart')}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />{t('palmLines.head')}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]" />{t('palmLines.life')}</span>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={share} className="flex-1 bg-gradient-to-r from-sage-600 to-sage-700 text-white font-semibold py-3 rounded-xl shadow-soft-xl hover:-translate-y-0.5 transition-all">
                {t('palmLines.share')}
              </button>
              <button onClick={download} className="px-5 border-2 border-sage-400 text-sage-800 font-semibold rounded-xl hover:bg-sage-200 transition-all">
                {t('palmLines.download')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
