/**
 * Payment Verification API Route
 * Verifies payment signatures from providers
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { activatePlan, isPlanType } from '@/lib/services/plan-activation'
import crypto from 'crypto'

function signaturesEqual(a: string, b: string): boolean {
  // timingSafeEqual throws when the buffers differ in length, which would
  // turn a wrong signature into a 500 instead of a clean rejection.
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { provider, paymentId, orderId, signature } = body

    if (!provider || !paymentId || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let verified = false
    let activatedPlan: string | null = null

    if (provider === 'razorpay') {
      // Verify Razorpay signature
      const secret = process.env.RAZORPAY_KEY_SECRET || ''
      const text = `${orderId}|${paymentId}`
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(text)
        .digest('hex')

      verified = signaturesEqual(signature, expectedSignature)

      if (verified) {
        // The signature proves Razorpay captured this payment, so the plan is
        // activated here on the server — never from the browser. The order id
        // is what create-intent stored as provider_payment_id.
        const { data: transaction } = await supabase
          .from('transactions')
          .select('id, status, metadata')
          .eq('provider_payment_id', orderId)
          .eq('provider', 'razorpay')
          .eq('user_id', user.id)
          .single()

        const planType = (transaction?.metadata as any)?.planType
        if (transaction && isPlanType(planType) && planType !== 'basic') {
          // Keep the Razorpay order id as the reference and record the
          // captured payment id alongside it in metadata.
          await supabase
            .from('transactions')
            .update({
              status: 'succeeded',
              metadata: {
                ...((transaction.metadata as any) || {}),
                razorpay_payment_id: paymentId,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', transaction.id)

          await activatePlan(supabase, user.id, planType)
          activatedPlan = planType
        } else if (!transaction) {
          console.error(
            `[verify] Razorpay signature valid but no matching order ${orderId} for user ${user.id}`
          )
        }
      }
    } else if (provider === 'stripe') {
      // Stripe verification is handled via webhooks
      verified = true
    } else if (provider === 'bitcoin') {
      // Bitcoin verification depends on implementation
      verified = true
    }

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      verified: true,
      // Set when a Razorpay payment also activated a plan above. The client
      // must treat this as informational only — the database is the authority.
      plan: activatedPlan,
    })
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
