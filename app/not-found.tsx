import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-soft flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-lg rounded-3xl p-8 border border-beige-300/50 shadow-soft-xl text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Page not found</h1>
        <p className="text-text-secondary mb-6">
          This page does not exist, or it has moved.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white rounded-xl font-semibold transition-all shadow-soft"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
