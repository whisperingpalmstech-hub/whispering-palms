import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import { activatePlan, isPlanType } from '@/lib/services/plan-activation'

/**
 * PUT /api/subscription/update
 *
 * Downgrade path ONLY: an authenticated user may move themselves to the free
 * `basic` plan (cancel). Upgrades to paid plans are NEVER granted here — they
 * are activated server-side by the payment webhooks / verify routes after the
 * provider confirms money changed hands. Previously any logged-in user could
 * PUT {"planType":"superflame"} and receive unlimited quota for free.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const { planType } = await request.json()

    if (!isPlanType(planType)) {
      return createErrorResponse('Invalid plan type. Must be: basic, spark, flame, or superflame', 400)
    }

    // Paid plans require a completed checkout. This endpoint only ever
    // downgrades to the free plan; upgrades are activated by the payment
    // webhooks and verify routes.
    if (planType !== 'basic') {
      return createErrorResponse(
        'Paid plans require a completed checkout. Please subscribe via the pricing page.',
        403
      )
    }

    const supabase = await createClient()

    // Check if user profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id, subscription_plan')
      .eq('user_id', user.id)
      .single()

    if (!existingProfile) {
      return createErrorResponse('User profile not found. Please complete onboarding first.', 404)
    }

    // The plan itself is always 'basic' here (paid plans are rejected above),
    // granted through the shared activation helper so quota math stays
    // identical to webhook/verify activations.
    try {
      await activatePlan(supabase, user.id, planType)
    } catch (error) {
      console.error('Error updating subscription plan:', error)
      return createErrorResponse('Failed to update subscription plan', 500)
    }

    return createSuccessResponse({
      message: `Subscription plan updated to ${planType}`,
      planType,
    })
  } catch (error) {
    console.error('Error in PUT /api/subscription/update:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}
