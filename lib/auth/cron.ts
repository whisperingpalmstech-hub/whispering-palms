/**
 * Authentication for machine-triggered endpoints.
 *
 * The email cron and send routes were reachable by anyone: no session, no
 * secret, and excluded from the middleware matcher. Hitting them repeatedly
 * would send every pending reading immediately, burn the mail quota, and (with
 * EMAIL_TEST_MODE on) deliver readings before their scheduled time.
 *
 * They now require a shared secret. Vercel Cron sends it automatically as
 * `Authorization: Bearer $CRON_SECRET`; external services can use the same
 * header or `?secret=`.
 */

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/utils/response'

/** Constant-time compare, so a wrong secret cannot be found by timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export function isCronRequestAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET

  // No secret configured. Allowed in local development only - in production
  // this would leave the endpoint open, which is the bug being fixed.
  if (!expected) {
    return process.env.NODE_ENV !== 'production'
  }

  const header = request.headers.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (bearer && safeEqual(bearer, expected)) return true

  const query = request.nextUrl.searchParams.get('secret') ?? ''
  if (query && safeEqual(query, expected)) return true

  return false
}

/**
 * Gate for cron routes.
 *
 *   const denied = requireCronAuth(request)
 *   if (denied) return denied
 */
export function requireCronAuth(request: NextRequest): NextResponse | null {
  if (isCronRequestAuthorized(request)) return null

  if (!process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    console.error(
      '[cron] CRON_SECRET is not set. Refusing to run a machine endpoint unauthenticated in production.'
    )
    return createErrorResponse('This endpoint is not configured', 503)
  }

  // 404 rather than 401: an unauthenticated caller should not learn the
  // endpoint exists.
  return createErrorResponse('Not found', 404)
}

/**
 * Admin-token gate for operational endpoints (Telegram setup, channel posts,
 * stats).
 *
 * These previously compared against `process.env.ADMIN_API_TOKEN ||
 * 'whispering-palms-admin'`. That default is in the source, so with the variable
 * unset anyone could post to the Telegram channel and repoint the bot's webhook.
 * There is no default any more: unset means the endpoint refuses.
 */
export function isAdminTokenValid(request: NextRequest): boolean {
  const expected = process.env.ADMIN_API_TOKEN

  // Fail closed. An unset token disables the endpoint rather than opening it.
  if (!expected || expected.length < 16) {
    if (expected) {
      console.error('[admin-token] ADMIN_API_TOKEN is too short to be safe (needs 16+ characters).')
    }
    return false
  }

  const header = request.headers.get('authorization') ?? ''
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : ''

  return bearer.length > 0 && safeEqual(bearer, expected)
}

/**
 * Gate for admin-token endpoints.
 *
 *   const denied = requireAdminToken(request)
 *   if (denied) return denied
 */
export function requireAdminToken(request: NextRequest): NextResponse | null {
  if (isAdminTokenValid(request)) return null

  if (!process.env.ADMIN_API_TOKEN) {
    console.error('[admin-token] ADMIN_API_TOKEN is not set. Refusing the request.')
  }

  return createErrorResponse('Not found', 404)
}
