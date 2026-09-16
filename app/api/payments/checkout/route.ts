/**
 * Stripe Checkout — the single payment entry point.
 *
 * Hosted Checkout rather than a custom card form:
 *   - no card data touches our servers (PCI surface stays minimal)
 *   - 3DS / SCA is handled by Stripe, which matters for EU and Indian cards
 *   - promotion codes work out of the box via allow_promotion_codes
 *   - Apple Pay / Google Pay come for free
 *
 * The price is ALWAYS resolved server-side from the Stripe price lookup key
 * (wp_<plan>_<period>). Nothing from the request body sets an amount.
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { isPaidPlanType, isBillingPeriod } from '@/lib/config/plans'

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.STRIPE_SECRET_KEY
    if (!secret) {
      return NextResponse.json(
        { error: 'Payments are not configured on this server' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planType, billingPeriod } = await request.json()

    if (!isPaidPlanType(planType) || !isBillingPeriod(billingPeriod)) {
      return NextResponse.json(
        { error: 'Invalid plan or billing period' },
        { status: 400 }
      )
    }

    const stripe = new Stripe(secret)

    // Resolve the price from Stripe itself. The catalog is the source of
    // truth for what is charged; the app only names which price it wants.
    const lookupKey = `wp_${planType}_${billingPeriod}`
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
    })
    const price = prices.data[0]
    if (!price) {
      console.error(`[checkout] No active Stripe price for lookup key ${lookupKey}`)
      return NextResponse.json(
        { error: 'That plan is not available right now' },
        { status: 503 }
      )
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

    // Reuse the customer across purchases so the billing portal and Stripe's
    // own dashboard show one customer per user rather than one per checkout.
    const existing = await stripe.customers.list({ email: user.email, limit: 1 })
    const customer =
      existing.data[0] ??
      (await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      }))

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: price.id, quantity: 1 }],
      // Lets a user redeem FREEMONTH (or any promotion code) on the hosted page.
      allow_promotion_codes: true,
      client_reference_id: user.id,
      // metadata on BOTH the session and the subscription: the session carries
      // it for checkout.session.completed, the subscription for every later
      // renewal/cancel event, which never sees the session.
      metadata: { userId: user.id, planType, billingPeriod },
      subscription_data: {
        metadata: { userId: user.id, planType, billingPeriod },
      },
      success_url: `${appUrl}/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscription?checkout=cancelled`,
    })

    return NextResponse.json({ success: true, url: session.url, id: session.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[checkout] failed:', message)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 500 })
  }
}
