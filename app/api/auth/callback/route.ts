/**
 * GET /api/auth/callback
 * Landing point for links in Supabase Auth emails (signup confirmation,
 * password recovery, magic link, email change).
 *
 * Supabase verifies the token then redirects here with either a PKCE `code`
 * or a `token_hash` + `type`. Both must be exchanged for a session cookie,
 * otherwise the user lands logged-out and the confirmation appears to fail.
 */

import { NextRequest, NextResponse } from 'next/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  return request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const baseUrl = getBaseUrl(request)

  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const errorDescription = searchParams.get('error_description')

  // Only allow same-origin relative redirects - an open redirect here would
  // hand an attacker a session-bearing link on our own domain.
  const requestedNext = searchParams.get('next')
  const next =
    requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : null

  if (errorDescription) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(errorDescription)}`
    )
  }

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(error.message)}`
      )
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(error.message)}`
      )
    }
  } else {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Invalid or expired confirmation link')}`
    )
  }

  // Session cookie is set. Mark the user confirmed in our own users table so
  // email_verified there does not drift from auth.users.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email_confirmed_at) {
    await supabase
      .from('users')
      .update({ email_verified: true, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  if (next) {
    return NextResponse.redirect(`${baseUrl}${next}`)
  }

  // Recovery links must land on the reset form, not the dashboard.
  if (type === 'recovery') {
    return NextResponse.redirect(`${baseUrl}/reset-password`)
  }

  return NextResponse.redirect(`${baseUrl}/onboarding`)
}
