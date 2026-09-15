/**
 * The gate for local development mode.
 *
 * Development mode replaces Supabase entirely - auth AND the database - with an
 * in-memory stub, so the app can be run and tested on a machine with no
 * Supabase project at all.
 *
 * SECURITY
 * --------
 * This bypasses authentication completely. Every request becomes a fixed test
 * user. It must never be reachable in production, so it is gated four ways and
 * every one of them must pass:
 *
 *   1. NODE_ENV must not be 'production'
 *   2. VERCEL_ENV must be unset (any Vercel deployment fails this, including
 *      preview builds, which are internet-reachable)
 *   3. DEV_AUTH_BYPASS must be exactly the string 'true' - explicit opt-in
 *   4. NEXT_PUBLIC_DEV_AUTH_BYPASS must match, so the client and server agree
 *
 * There is deliberately no way to force this on. If you are reading this
 * because you want it enabled somewhere it is refusing to run, the answer is a
 * real Supabase project, not a fifth escape hatch.
 *
 * scripts/check-no-dev-bypass.ts fails the build if the flag is set while
 * building for production.
 */

/** True only when every gate passes. */
export function isDevBypassEnabled(): boolean {
  // Hard stops first. These cannot be overridden by configuration.
  if (process.env.NODE_ENV === 'production') return false
  if (process.env.VERCEL_ENV) return false
  if (process.env.VERCEL === '1') return false

  // Explicit opt-in. Both must be set, and to exactly 'true'.
  const server = process.env.DEV_AUTH_BYPASS
  const client = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS

  return server === 'true' && client === 'true'
}

/**
 * Client-side check.
 *
 * Only NEXT_PUBLIC_* variables are inlined into the browser bundle, so this
 * cannot consult DEV_AUTH_BYPASS. That is fine: nothing security-relevant is
 * decided in the browser. Every API route re-checks with isDevBypassEnabled().
 */
export function isDevBypassEnabledClient(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true'
}

let warned = false

/** Print a loud, once-per-process warning so this is never on by accident. */
export function warnIfDevBypassActive(): void {
  if (!isDevBypassEnabled() || warned) return
  warned = true

  console.warn('')
  console.warn('  ╔════════════════════════════════════════════════════════════╗')
  console.warn('  ║  DEV AUTH BYPASS IS ACTIVE                                 ║')
  console.warn('  ║                                                            ║')
  console.warn('  ║  Authentication is disabled. Every request is treated as    ║')
  console.warn('  ║  the test user, and all data is in-memory and resets on     ║')
  console.warn('  ║  restart. Supabase is not contacted at all.                 ║')
  console.warn('  ║                                                            ║')
  console.warn('  ║  Local development only. Never deploy with this set.        ║')
  console.warn('  ╚════════════════════════════════════════════════════════════╝')
  console.warn('')
}
