'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import WhisperingPalmsLogo from '@/app/components/Logo'
import {
  LINE_META,
  ABSENT_NOTE,
  PALM_SHAPE_NOTE,
  MOUNT_LABEL,
  MOUNT_QUALITY,
  MOUNT_STATE,
  CONFIDENCE_NOTE,
  meaningsFor,
  type LineKey,
} from '@/lib/services/palmistry-meanings'

interface Line {
  present?: boolean
  length?: string
  depth?: string
  clarity?: string
  curve?: string
  observation?: string
}

/**
 * The stored analysis, as produced by lib/services/palm-analysis.ts.
 *
 * Field names are camelCase because that is what analysePalmPhoto() returns
 * and what is persisted in answers.palm_analysis — NOT the snake_case of the
 * model's raw JSON. Reading the wrong casing here silently renders every
 * value as an em dash.
 */
interface Analysis {
  palmDetected?: boolean
  hand?: string
  imageQuality?: string
  palmShape?: string
  fingerLength?: string
  indexVsRing?: string
  lines?: Record<string, Line>
  mounts?: Record<string, string>
  specialMarks?: string[]
  confidence?: string
}

interface Report {
  answerId: string
  question: string | null
  reading: string
  createdAt: string
  palms: Array<{ palmType: string; analysis: Analysis }>
  hasAnalysis: boolean
}

const titleCase = (s?: string) =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * The report behind a reading.
 *
 * Shows the palm findings the reading was generated from, separating what was
 * OBSERVED in the photo from what palmistry traditionally READS INTO it. That
 * separation is the point: a user should be able to see the evidence before
 * the meaning, and see plainly when a line was not visible at all.
 */
export default function ReportPage({ params }: { params: Promise<{ answerId: string }> }) {
  const { answerId } = use(params)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/report/${answerId}`)
      .then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body?.error?.message || 'Could not load this report')
        setReport(body.data)
      })
      .catch((e) => setError(e.message))
  }, [answerId])

  if (error) {
    return (
      <main className="min-h-screen bg-beige-100 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-text-primary mb-4">{error}</p>
          <Link href="/dashboard" className="text-gold-700 underline">Back to dashboard</Link>
        </div>
      </main>
    )
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-beige-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
      </main>
    )
  }

  const primaryPalm = report.palms[0]
  const primary = primaryPalm?.analysis
  const lineKeys: LineKey[] = ['heart', 'head', 'life', 'fate']
  const visibleCount = primary?.lines
    ? lineKeys.filter((k) => primary.lines?.[k]?.present).length
    : 0

  // Label the palm by what the USER filed it as, not by the model's own
  // left/right guess. Those two disagree in practice (a palm photo is easy to
  // mirror, and the model reads orientation from the image alone), and
  // showing "right hand" on a photo the user uploaded as their left reads as
  // broken. The upload label is the fact we actually know.
  const palmLabel = primaryPalm?.palmType?.startsWith('left')
    ? 'Left palm'
    : primaryPalm?.palmType?.startsWith('right')
      ? 'Right palm'
      : '—'

  return (
    <main className="min-h-screen bg-beige-100 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <WhisperingPalmsLogo className="w-12 h-12" />
          </div>
          <p className="text-[11px] tracking-[3px] uppercase text-gold-700">Whispering Palms</p>
          <h1 className="text-3xl sm:text-4xl font-serif text-text-primary mt-2">Your Palm Report</h1>
          <p className="text-text-secondary text-sm mt-2 max-w-lg mx-auto">
            Read from your own photograph. Everything below is something we could actually see.
          </p>
        </header>

        {/* Reading */}
        <section className="bg-gradient-to-br from-gold-50 to-peach-50 border-2 border-gold-400 rounded-2xl p-6 sm:p-8 mb-6">
          {report.question && (
            <p className="italic text-text-secondary border-l-4 border-gold-400 pl-3 mb-4">
              “{report.question}”
            </p>
          )}
          <div className="space-y-3 text-text-primary leading-relaxed">
            {report.reading.split('\n').filter((p) => p.trim()).map((p, i) => (
              <p key={i}>{p.trim()}</p>
            ))}
          </div>
        </section>

        {!report.hasAnalysis ? (
          <section className="bg-white border border-beige-300 rounded-2xl p-6 text-center">
            <p className="text-text-secondary text-sm">
              No palm analysis was stored with this reading, so there are no findings to show.
              Readings generated from now on include the full analysis.
            </p>
            <Link href="/chat" className="inline-block mt-4 text-gold-700 underline">Ask a new question</Link>
          </section>
        ) : (
          <>
            {/* At a glance */}
            <section className="bg-white border border-beige-300 rounded-2xl p-6 sm:p-7 mb-6">
              <h2 className="text-xl font-serif text-text-primary border-b-2 border-gold-400 inline-block pb-1 mb-4">
                At a glance
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ['Palm', palmLabel],
                  ['Photo quality', titleCase(primary?.imageQuality)],
                  ['Palm shape', titleCase(primary?.palmShape)],
                  ['Finger length', titleCase(primary?.fingerLength)],
                  ['Index vs ring', titleCase(primary?.indexVsRing)],
                  ['Lines visible', `${visibleCount} of 4`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className="block text-[10px] tracking-[2px] uppercase text-text-secondary">{label}</span>
                    <b className="font-normal text-text-primary">{value || '—'}</b>
                  </div>
                ))}
              </div>
              {primary?.palmShape && PALM_SHAPE_NOTE[primary.palmShape] && (
                <p className="text-sm text-text-secondary mt-4">{PALM_SHAPE_NOTE[primary.palmShape]}</p>
              )}
              {primary?.confidence && (
                <div className="mt-4 bg-gold-50 border-l-4 border-gold-500 rounded px-4 py-3 text-sm text-text-secondary">
                  <b className="text-text-primary font-semibold">Confidence: {titleCase(primary.confidence)}.</b>{' '}
                  {CONFIDENCE_NOTE[primary.confidence]}
                </div>
              )}
            </section>

            {/* Lines */}
            <section className="mb-6">
              <h2 className="text-xl font-serif text-text-primary mb-4">The four major lines</h2>
              <div className="space-y-4">
                {lineKeys.map((key) => {
                  const meta = LINE_META[key]
                  const line = primary?.lines?.[key]
                  const present = !!line?.present
                  return (
                    <div
                      key={key}
                      className={`bg-white border border-beige-300 rounded-2xl p-5 sm:p-6 ${present ? '' : 'opacity-75'}`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ background: meta.colour }}
                        />
                        <div>
                          <h3 className="text-lg font-serif text-text-primary leading-tight">{meta.title}</h3>
                          <p className="text-xs text-text-secondary">{meta.tagline}</p>
                        </div>
                      </div>

                      {present ? (
                        <>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {[line?.length && `${line.length} length`, line?.depth && `${line.depth} depth`, line?.clarity, line?.curve?.replace(/_/g, ' ')]
                              .filter(Boolean)
                              .map((chip) => (
                                <span
                                  key={String(chip)}
                                  className="text-xs px-2.5 py-1 rounded-full border capitalize"
                                  style={{ borderColor: meta.colour, color: '#3b342c' }}
                                >
                                  {chip}
                                </span>
                              ))}
                          </div>
                          {line?.observation && (
                            <p className="text-sm text-text-primary mb-2">
                              <b className="font-semibold">What we saw:</b> {line.observation}
                            </p>
                          )}
                          {meaningsFor(key, line || {}).length > 0 && (
                            <p className="text-sm text-text-secondary italic">
                              {meaningsFor(key, line || {}).join(' ')}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-text-secondary">{ABSENT_NOTE[key]}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Mounts */}
            {primary?.mounts && Object.keys(primary.mounts).length > 0 && (
              <section className="bg-white border border-beige-300 rounded-2xl p-6 sm:p-7 mb-6">
                <h2 className="text-xl font-serif text-text-primary border-b-2 border-gold-400 inline-block pb-1 mb-3">
                  Mounts
                </h2>
                <p className="text-sm text-text-secondary mb-4">
                  The fleshy pads of the palm. Tradition links each to a quality — a well-developed mount is read as that quality being strong.
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {Object.entries(primary.mounts).map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between bg-beige-100 rounded-lg px-3 py-2.5">
                      <div>
                        <span className="text-sm text-text-primary">{MOUNT_LABEL[k] || k}</span>
                        <span className="block text-[11px] text-text-secondary">{MOUNT_QUALITY[k]}</span>
                      </div>
                      <b className={`text-sm font-normal ${v === 'prominent' ? 'text-gold-700' : 'text-text-secondary'}`}>
                        {MOUNT_STATE[v] || v}
                      </b>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <div className="text-center mt-8">
          <Link
            href="/chat"
            className="inline-block bg-gradient-to-r from-gold-500 to-gold-700 text-white font-semibold px-8 py-3.5 rounded-full shadow-soft-xl"
          >
            Ask another question
          </Link>
        </div>

        <footer className="text-center mt-10 text-xs text-text-secondary">
          <p>Whispering Palms · May the stars guide your path</p>
          <p className="italic max-w-md mx-auto mt-2">
            Palmistry interpretations are traditional and offered for reflection and guidance.
            They are not statements of fact, medical advice, or predictions of your future.
          </p>
        </footer>
      </div>
    </main>
  )
}
