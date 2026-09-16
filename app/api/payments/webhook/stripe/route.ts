/**
 * Stripe Webhook Handler
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPaymentService } from '@/lib/services/payment/PaymentService'
import { createAdminClient } from '@/lib/supabase/admin'
import { activatePlan, isPlanType, type PlanType } from '@/lib/services/plan-activation'
import Stripe from 'stripe'

/** Stripe metadata is free-form strings; never trust it as a plan name. */
function planTypeOrBasic(value: unknown): PlanType {
  return isPlanType(value) ? value : 'basic'
}

// The Stripe client is built PER REQUEST, not at module scope.
//
// Next collects page data at build time, which imports this module. A
// module-level `new Stripe(...)` therefore runs during `next build`, and with
// no STRIPE_SECRET_KEY in the build environment the constructor throws
// "Neither apiKey nor config.authenticator provided" — failing the whole
// build, so no deployment is ever created. Vercel does not expose runtime env
// vars to every build step, so the key genuinely is absent then.
//
// No fallback key: a literal test key in the source is a secret in version
// control, and it silently turns a misconfigured deploy into one that appears
// to work against the wrong Stripe account. Unset means the request fails
// loudly at runtime, which is the honest failure.
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' as any })
}

// Webhook secret for verifying Stripe events
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    console.error('[stripe] STRIPE_SECRET_KEY is not set; cannot verify webhook')
    return NextResponse.json(
      { error: 'Payments are not configured on this server' },
      { status: 503 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )

    const supabase = createAdminClient()

    // Log webhook event
    await supabase.from('webhook_events').insert({
      provider: 'stripe',
      event_id: event.id,
      event_type: event.type,
      payload: event.data.object,
      processed: false,
    })

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, supabase)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, supabase)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase)
        break

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, supabase)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark event as processed
    await supabase
      .from('webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('provider', 'stripe')
      .eq('event_id', event.id)

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  await supabase
    .from('transactions')
    .update({
      status: 'succeeded',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_payment_id', paymentIntent.id)
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_payment_id', paymentIntent.id)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: any) {
  const userId = subscription.metadata.userId
  if (!userId) return

  await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_type: subscription.metadata.planType || 'basic',
      billing_period: subscription.metadata.billingPeriod || 'monthly',
      status: normalizeStripeStatus(subscription.status),
      provider: 'stripe',
      provider_subscription_id: subscription.id,
      provider_customer_id: subscription.customer as string,
      start_date: new Date(subscription.created * 1000).toISOString(),
      end_date: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      next_billing_date: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: subscription.metadata,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'provider_subscription_id,provider',
    })

  // Reconcile the daily quota too, not just the plan name. Writing
  // subscription_plan alone leaves daily_quotas on the old tier, so a user who
  // just paid keeps the free question limit until the next nightly reset.
  await activatePlan(supabase, userId, planTypeOrBasic(subscription.metadata.planType))
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabase: any) {
  const metadata = session.metadata || {}
  const userId = metadata.userId || session.client_reference_id
  const planType = planTypeOrBasic(metadata.planType)

  if (!userId) return

  // activatePlan writes the plan AND resizes today's quota. Updating
  // subscription_plan on its own would leave the user on free-tier questions
  // immediately after paying.
  await activatePlan(supabase, userId, planType)

  // Track the transaction
  await supabase.from('transactions').insert({
    user_id: userId,
    type: 'subscription',
    amount: (session.amount_total || 0) / 100,
    currency: (session.currency || 'USD').toUpperCase(),
    provider: 'stripe',
    provider_payment_id: session.id, // Storing session ID as reference
    status: 'succeeded',
    metadata: {
      ...metadata,
      event: 'checkout_session_completed'
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: any) {
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider_subscription_id', subscription.id)
    .eq('provider', 'stripe')

  // Downgrade the user too. Marking the subscription row cancelled while
  // leaving user_profiles.subscription_plan on the paid tier let a cancelled
  // customer keep paid access — and the paid question quota — indefinitely.
  const userId = subscription.metadata?.userId
  if (userId) {
    await activatePlan(supabase, userId, 'basic')
  } else {
    console.error(
      `[stripe] subscription ${subscription.id} deleted with no userId in metadata; cannot downgrade`
    )
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  if (invoice.subscription) {
    // Create transaction record for renewal
    await supabase.from('transactions').insert({
      user_id: invoice.metadata?.userId || '',
      type: 'renewal',
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency.toUpperCase(),
      provider: 'stripe',
      provider_payment_id: invoice.payment_intent as string,
      provider_customer_id: invoice.customer as string,
      status: 'succeeded',
      metadata: invoice.metadata || {},
    })
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  if (invoice.subscription) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('provider_subscription_id', invoice.subscription as string)
      .eq('provider', 'stripe')
  }
}

function normalizeStripeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'trialing': 'trial',
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'expired',
    'incomplete': 'incomplete',
    'incomplete_expired': 'incomplete_expired',
  }
  return statusMap[status] || 'active'
}
