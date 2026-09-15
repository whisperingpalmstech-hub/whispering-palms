'use client'

/**
 * Last-resort boundary for errors in the root layout itself.
 *
 * This replaces the entire document, so it cannot rely on the app's fonts,
 * Tailwind, or providers - everything here is inline.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, "Times New Roman", serif',
          background: '#f5f5f0',
          color: '#1a1a1a',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
            Whispering Palms is temporarily unavailable
          </h1>
          <p style={{ color: '#555', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '9999px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#999' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
