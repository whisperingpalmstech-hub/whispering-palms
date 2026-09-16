/**
 * Verify Stripe Checkout Session API Route
 * This provides immediate feedback after payment redirect
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2025-02-24.acacia',
})

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('session_id')

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Retrieve session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription'],
        })

        if (!session || session.status !== 'complete' || session.payment_status !== 'paid') {
            return NextResponse.json({
                success: false,
                status: session.status,
                payment_status: session.payment_status,
                message: 'Payment not completed'
            })
        }

        // Payment is valid. Ensure database is updated.
        // This acts as a fallback for webhooks.
        const metadata = session.metadata || {}
        const planType = metadata.planType || 'basic'
        const userId = metadata.userId || session.client_reference_id

        if (userId !== user.id) {
            return NextResponse.json({ error: 'Security mismatch' }, { status: 403 })
        }

        // Update user profile
        await supabase
            .from('user_profiles')
            .update({
                subscription_plan: planType,
            })
            .eq('user_id', userId)

        // Log the transaction if it doesn't exist
        const { data: existingTx } = await supabase
            .from('transactions')
            .select('id')
            .eq('provider_payment_id', session.id)
            .single()

        if (!existingTx) {
            await supabase.from('transactions').insert({
                user_id: userId,
                type: 'subscription',
                amount: (session.amount_total || 0) / 100,
                currency: (session.currency || 'USD').toUpperCase(),
                provider: 'stripe',
                provider_payment_id: session.id,
                status: 'succeeded',
                metadata: {
                    ...metadata,
                    source: 'manual_verification'
                },
            })
        }

        return NextResponse.json({
            success: true,
            plan: planType,
            message: 'Plan updated successfully'
        })
    } catch (error: any) {
        console.error('Session verification error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
