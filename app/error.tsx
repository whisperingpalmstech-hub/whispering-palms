'use client'

/**
 * Route-level error boundary.
 *
 * Without this a runtime error showed the default Next.js error screen, which
 * in production is an unstyled "Application error" page with no way forward.
 */

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <main className="min-h-screen bg-gradient-soft flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-beige-300/50 shadow-soft-xl text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Something went wrong</h1>
        <p className="text-text-secondary mb-6">
          The page could not be loaded. Nothing you have saved was lost.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white rounded-xl font-semibold transition-all shadow-soft"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-white border border-beige-300 hover:bg-beige-50 text-text-primary rounded-xl font-semibold transition-all"
          >
            Back to dashboard
          </Link>
        </div>

        {/* The digest is the only safe way to correlate a user report with a
            server log - the message itself may contain internal detail. */}
        {error.digest && (
          <p className="mt-6 text-xs text-text-tertiary font-mono">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  )
}
