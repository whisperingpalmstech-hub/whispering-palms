import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import { anythingLLMService } from '@/lib/services/anythingllm'
import { isEmailSendError, isRateLimitError, RATE_LIMIT_MESSAGE } from '@/lib/auth/errors'
import { normalizeCountry } from '@/lib/utils/countries'
import { createAdminClient } from '@/lib/supabase/admin'
import { maxQuestionsForPlan } from '@/lib/services/plan-activation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, country } = body
    const countryCode = normalizeCountry(country)

    // Validate input
    if (!email || !password) {
      return createErrorResponse('Email and password are required', 400)
    }

    if (password.length < 8) {
      return createErrorResponse('Password must be at least 8 characters', 400)
    }

    const supabase = await createClient()

    // Row Level Security is on, and signUp does not return a session while email
    // confirmation is pending - so auth.uid() is null here and the anon client
    // cannot write these rows. The service role can.
    const db = createAdminClient()

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

    // Sign up with Supabase Auth.
    // Supabase relays the confirmation email through the custom SMTP host
    // configured in the dashboard - see docs/EMAIL_SETUP.md.
    const signUpResult = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/api/auth/callback`,
        data: {
          name: name || '',
          country: countryCode || '',
        },
      },
    })

    let authData = signUpResult.data
    let authError = signUpResult.error

    // Supabase returns success with an EMPTY identities array when the address
    // is already registered (it deliberately does not confirm the account
    // exists). Treat that as a login attempt rather than a silent no-op.
    if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
      const signInResult = await supabase.auth.signInWithPassword({ email, password })

      if (signInResult.error) {
        return createErrorResponse(
          'An account with this email already exists. The password provided is incorrect. Please log in.',
          401
        )
      }

      authData = signInResult.data as any
      authError = null
    } else if (authError) {
      // A raw "email rate limit exceeded" tells the user nothing actionable.
      if (isRateLimitError(authError)) {
        return createErrorResponse(RATE_LIMIT_MESSAGE, 429)
      }

      if (isEmailSendError(authError)) {
        console.error('Supabase Auth could not send the confirmation email:', authError)
        return createErrorResponse(
          'We could not send your confirmation email. Please try again shortly.',
          503
        )
      }

      return createErrorResponse(authError.message, 400)
    }

    if (!authData.user) {
      return createErrorResponse('Failed to create or login user', 500)
    }

    // Create user record in custom users table
    // This allows us to store additional fields not in Supabase Auth
    const { error: dbError } = await db.from('users').insert({
      id: authData.user.id,
      email: authData.user.email!,
      name: name || null,
      country: countryCode,
      email_verified: authData.user.email_confirmed_at ? true : false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // If database insert fails but user was created in Auth, continue
    // (user can update profile later)
    if (dbError) {
      console.error('Failed to create user record:', dbError)
      // Don't fail the request, user can complete profile later
    }

    // Quota default comes from the shared plan config so a new account agrees
    // with lib/services/quota.ts from the first day.
    const basicMaxQuestions = maxQuestionsForPlan('basic')
    const today = new Date().toISOString().split('T')[0]
    const resetAt = new Date()
    resetAt.setDate(resetAt.getDate() + 1)
    resetAt.setHours(0, 0, 0, 0)

    const { error: profileError } = await db
      .from('user_profiles')
      .upsert(
        {
          user_id: authData.user.id,
          subscription_plan: 'basic',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

    if (profileError) {
      console.error('Failed to initialize user profile:', profileError)
    }

    const { error: quotaError } = await db
      .from('daily_quotas')
      .upsert(
        {
          user_id: authData.user.id,
          date: today,
          plan_type: 'basic',
          max_questions: basicMaxQuestions,
          remaining_questions: basicMaxQuestions,
          reset_at: resetAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,date',
        }
      )

    if (quotaError) {
      console.error('Failed to initialize daily quota:', quotaError)
    }

    // Create AnythingLLM workspace for the user (non-blocking)
    // This happens in the background, so registration doesn't fail if AnythingLLM is down
    try {
      const workspaceId = await anythingLLMService.createWorkspace(
        authData.user.id,
        name || email
      )

      // Store workspace ID in database
      await db.from('anythingllm_workspaces').insert({
        user_id: authData.user.id,
        workspace_id: workspaceId,
      })

    } catch (workspaceError) {
      // Workspace creation failed but don't fail registration
      // Workspace can be created later when user accesses Q&A features
      // Only log if it's not an API key issue (to reduce noise)
      if (workspaceError instanceof Error && !workspaceError.message.includes('API key')) {
        console.error('Error creating AnythingLLM workspace:', workspaceError)
      }
    }

    return createSuccessResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        email_verified: !!authData.user.email_confirmed_at,
      },
      message: authData.user.email_confirmed_at
        ? 'Registration successful'
        : 'Registration successful. Please check your email to verify your account.',
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}
