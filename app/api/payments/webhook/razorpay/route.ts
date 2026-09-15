/**
 * Razorpay Webhook Handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { activatePlan, isPlanType } from '@/lib/services/plan-activation'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-razorpay-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  try {
    // Verify webhook signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)
    // Webhooks carry no user session, so they must use the service-role
    // client: RLS owner policies would deny every one of these writes to the
    // anonymous role. User attribution always comes from the verified payload.
    const supabase = createAdminClient()

    // Log webhook event
    await supabase.from('webhook_events').insert({
      provider: 'razorpay',
      event_id: event.event,
      event_type: event.event,
      payload: event.payload,
      processed: false,
    })

    // Handle different event types
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event.payload, supabase)
        break

      case 'payment.failed':
        await handlePaymentFailed(event.payload, supabase)
        break

      case 'subscription.created':
      case 'subscription.activated':
      case 'subscription.charged':
        await handleSubscriptionUpdated(event.payload, supabase)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.event}`)
    }

    // Mark event as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('provider', 'razorpay')
      .eq('event_id', event.event)

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}

async function handlePaymentCaptured(payload: any, supabase: any) {
  const payment = payload.payment.entity

  // create-intent stores the Razorpay ORDER id as provider_payment_id, so
  // match on payment.order_id first (payment.id is the captured payment).
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id, user_id, metadata')
    .eq('provider_payment_id', payment.order_id)
    .eq('provider', 'razorpay')
    .single()

  if (transaction) {
    await supabase
      .from('transactions')
      .update({
        status: 'succeeded',
        metadata: {
          ...((transaction.metadata as any) || {}),
          razorpay_payment_id: payment.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    // Idempotent with /api/payments/verify, which activates from the same
    // transaction row: whoever runs first wins, the second is a no-op.
    const planType = (transaction.metadata as any)?.planType
    if (transaction.user_id && isPlanType(planType) && planType !== 'basic') {
      try {
        await activatePlan(supabase, transaction.user_id, planType)
      } catch (error) {
        console.error('[razorpay webhook] plan activation failed:', error)
      }
    }
  } else {
    // Fallback for rows recorded with the payment id (legacy verify path).
    await supabase
      .from('transactions')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString(),
      })
      .eq('provider_payment_id', payment.id)
      .eq('provider', 'razorpay')
  }
}

async function handlePaymentFailed(payload: any, supabase: any) {
  const payment = payload.payment.entity

  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_payment_id', payment.id)
    .eq('provider', 'razorpay')
}

async function handleSubscriptionUpdated(payload: any, supabase: any) {
  const subscription = payload.subscription.entity
  const userId = subscription.notes?.userId
  if (!userId) return

  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_type: subscription.notes?.planType || 'basic',
      billing_period: subscription.notes?.billingPeriod || 'monthly',
      status: normalizeRazorpayStatus(subscription.status),
      provider: 'razorpay',
      provider_subscription_id: subscription.id,
      provider_customer_id: subscription.customer_id || '',
      start_date: new Date(subscription.created_at * 1000).toISOString(),
      end_date: subscription.end_at
        ? new Date(subscription.end_at * 1000).toISOString()
        : null,
      next_billing_date: subscription.current_end
        ? new Date(subscription.current_end * 1000).toISOString()
        : null,
      metadata: subscription.notes || {},
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'provider_subscription_id,provider',
    })
}

async function handleSubscriptionCancelled(payload: any, supabase: any) {
  const subscription = payload.subscription.entity

  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider_subscription_id', subscription.id)
    .eq('provider', 'razorpay')
}

function normalizeRazorpayStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'created': 'trial',
    'authenticated': 'active',
    'active': 'active',
    'pending': 'active',
    'halted': 'past_due',
    'cancelled': 'canceled',
    'completed': 'expired',
    'expired': 'expired',
  }
  return statusMap[status] || 'active'
}
