/**
 * Create Payment Intent API Route
 * Supports Stripe, Razorpay, and Bitcoin
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPaymentService } from '@/lib/services/payment/PaymentService'
import { createClient } from '@/lib/supabase/server'
import { PaymentProvider } from '@/lib/services/payment/types'
import { getPlanPrice } from '@/lib/config/plans'

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
    const {
      planType,
      billingPeriod,
      provider = 'stripe' as PaymentProvider,
      currency = 'USD'
      // NOTE: a client-supplied `amount` used to be accepted here and take
      // priority over the server price - anyone could set their own charge
      // amount for any plan. The price is now always computed server-side;
      // nothing from the request body feeds into what gets charged.
    } = body

    if (!planType || !billingPeriod) {
      return NextResponse.json(
        { error: 'Missing required fields: planType, billingPeriod' },
        { status: 400 }
      )
    }

    const finalAmount = getPlanPrice(planType, billingPeriod)

    if (finalAmount === null) {
      return NextResponse.json(
        { error: 'Invalid plan or billing period' },
        { status: 400 }
      )
    }

    const paymentService = getPaymentService()

    // Get user email for metadata
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const paymentIntent = await paymentService.createPaymentIntent(
      {
        userId: user.id,
        amount: finalAmount,
        currency,
        planType,
        billingPeriod,
        metadata: {
          email: user.email || '',
          name: profile?.name || '',
        },
      },
      provider
    )

    // Store transaction in database
    const { error: dbError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'subscription',
        amount: finalAmount,
        currency,
        provider,
        provider_payment_id: paymentIntent.id,
        status: paymentIntent.status,
        metadata: {
          planType,
          billingPeriod,
          ...paymentIntent.metadata,
        },
      })

    if (dbError) {
      console.error('Error storing transaction:', dbError)
    }

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
    })
  } catch (error: any) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
