/**
 * POST /api/auth/resend-confirmation
 * Re-send the signup confirmation email.
 *
 * Needed because a confirmation mail can be missed or expire. Without this the
 * only recovery is creating a second account, which collides on the unique email.
 */

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

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/auth/callback`,
      },
    })

    if (error && isRateLimitError(error)) {
      return createErrorResponse(RATE_LIMIT_MESSAGE, 429)
    }

    // Any other error is swallowed: reporting it would reveal whether the
    // address is registered and whether it is already confirmed.
    return createSuccessResponse({
      message:
        'If that address needs confirming, a new confirmation email is on its way.',
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}
