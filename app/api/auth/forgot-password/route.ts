import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '@/lib/auth/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return createErrorResponse('Email is required', 400)
    }

    const supabase = await createClient()

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

    // Send password reset email via Supabase Auth.
    // Routed through /api/auth/callback so the recovery token is exchanged for a
    // session before the reset form loads.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
    })

    if (error) {
      // A rate limit is a real, retryable condition and must be surfaced -
      // silently claiming success would leave the user waiting for mail that
      // was never sent.
      if (isRateLimitError(error)) {
        return createErrorResponse(RATE_LIMIT_MESSAGE, 429)
      }

      // Any other error is swallowed so we don't reveal whether the address
      // is registered.
      return createSuccessResponse({
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    return createSuccessResponse({
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}
