/**
 * Auth error helpers.
 *
 * Supabase surfaces send-rate problems as a 429 with a message like
 * "email rate limit exceeded". Before custom SMTP that was Supabase's own
 * ~2/hour built-in sender; after custom SMTP it is the configurable per-hour
 * limit under Authentication -> Rate Limits. Either way the user needs a
 * message that tells them what to do instead of a raw provider string.
 */

export const RATE_LIMIT_MESSAGE =
  'Too many emails have been sent recently. Please wait a few minutes and try again.'

export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { status?: number; code?: string; message?: string }

  if (candidate.status === 429) return true
  if (candidate.code === 'over_email_send_rate_limit') return true
  if (candidate.code === 'over_request_rate_limit') return true

  const message = candidate.message?.toLowerCase() ?? ''
  return message.includes('rate limit') || message.includes('too many requests')
}

/**
 * True when Supabase could not hand the message to the SMTP relay at all
 * (bad credentials, relay down, sender not verified).
 */
export function isEmailSendError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: string; message?: string }

  if (candidate.code === 'unexpected_failure') {
    const message = candidate.message?.toLowerCase() ?? ''
    return message.includes('email') || message.includes('smtp')
  }

  const message = candidate.message?.toLowerCase() ?? ''
  return message.includes('error sending confirmation') || message.includes('smtp')
}
