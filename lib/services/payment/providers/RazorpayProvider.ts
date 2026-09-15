/**
 * Razorpay Payment Provider Implementation
 */

import Razorpay from 'razorpay'
import crypto from 'crypto'
import { PaymentProviderInterface, PaymentIntent, Subscription, CreatePaymentIntentParams, CreateSubscriptionParams, WebhookEvent, PaymentStatus, SubscriptionStatus, PlanType, BillingPeriod } from '../types'
import { convertUSDToINR } from '@/lib/utils/currency'

export class RazorpayProvider implements PaymentProviderInterface {
  private razorpay: Razorpay

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured')
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    const { userId, amount, currency, planType, billingPeriod, metadata } = params

    // Razorpay supports UPI and Net Banking ONLY for INR currency
    // Convert USD (or other currencies) to INR for Razorpay
    const razorpayCurrency = 'INR'
    let razorpayAmount = amount

    // Convert to INR if currency is not INR
    if (currency !== 'INR') {
      if (currency === 'USD') {
        razorpayAmount = convertUSDToINR(amount)
      } else {
        // For other currencies, you can add conversion logic here
        // For now, assume same amount (should be handled properly in production)
        console.warn(`Currency conversion not implemented for ${currency}, using amount as is`)
      }
    }

    // Generate short receipt ID (max 40 chars for Razorpay)
    // Format: ord_<timestamp><user_short_id>
    const timestamp = Date.now().toString().slice(-10) // Last 10 digits
    const userShortId = userId.replace(/-/g, '').slice(0, 8) // First 8 chars of UUID without dashes
    const receipt = `ord_${timestamp}${userShortId}`.slice(0, 40) // Ensure max 40 chars

    const order = await this.razorpay.orders.create({
      amount: Math.round(razorpayAmount * 100), // Convert to paise (INR smallest unit)
      currency: razorpayCurrency, // Always use INR for Razorpay
      receipt: receipt,
      notes: {
        userId,
        planType,
        billingPeriod,
        originalCurrency: currency, // Store original currency in notes
        originalAmount: amount, // Store original amount in notes
        convertedAmount: razorpayAmount, // Store converted INR amount
        ...metadata,
      },
    })

    return {
      id: order.id,
      provider: 'razorpay',
      amount: razorpayAmount, // Return converted INR amount
      currency: razorpayCurrency, // Return INR for Razorpay
      status: this.normalizePaymentStatus(order.status),
      metadata: order.notes as Record<string, string>,
    }
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    const { userId, planType, billingPeriod, paymentMethodId, metadata } = params

    // Get or create customer
    let customerId: string
    try {
      const customers = await this.razorpay.customers.all({ count: 100 })
      const existingCustomer = customers.items.find(c => c.email === metadata?.email)
      
      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        const customer = await this.razorpay.customers.create({
          email: metadata?.email,
          name: metadata?.name,
          notes: {
            userId,
            ...metadata,
          },
        })
        customerId = customer.id
      }
    } catch (error) {
      throw new Error(`Failed to create/get customer: ${error}`)
    }

    // Create plan
    const planId = await this.getOrCreatePlan(planType, billingPeriod)

    // Create subscription
    const subscription = await this.razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: billingPeriod === 'yearly' ? 12 : 1, // For yearly, set to 12 months
      notes: {
        userId,
        planType,
        billingPeriod,
        ...metadata,
      },
    })

    return {
      id: subscription.id,
      userId,
      planType,
      billingPeriod,
      status: this.normalizeSubscriptionStatus(subscription.status),
      provider: 'razorpay',
      providerSubscriptionId: subscription.id,
      providerCustomerId: customerId,
      startDate: new Date(subscription.created_at * 1000),
      endDate: subscription.end_at ? new Date(subscription.end_at * 1000) : undefined,
      nextBillingDate: subscription.current_end ? new Date(subscription.current_end * 1000) : undefined,
      metadata: subscription.notes as Record<string, any>,
    }
  }

  async cancelSubscription(subscriptionId: string, reason?: string): Promise<Subscription> {
    // The SDK types this second parameter as boolean | number: true cancels
    // at the end of the current billing cycle. The reason is recorded in our
    // own transactions metadata instead of Razorpay notes.
    const subscription = await this.razorpay.subscriptions.cancel(subscriptionId, true)

    return this.mapRazorpaySubscription(subscription)
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Pick<Subscription, 'planType' | 'billingPeriod'>>
  ): Promise<Subscription> {
    // Razorpay requires canceling and creating a new subscription
    // For now, we'll cancel and let user create a new one
    // In production, implement proper plan switching
    throw new Error('Plan updates not directly supported. Please cancel and create a new subscription.')
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    try {
      const subscription = await this.razorpay.subscriptions.fetch(subscriptionId)
      return this.mapRazorpaySubscription(subscription)
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null
      }
      throw error
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): boolean {
    const payloadString = typeof payload === 'string' ? payload : payload.toString()
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    // Implementation depends on event type
  }

  async getPaymentMethods(customerId: string): Promise<any[]> {
    // Razorpay doesn't have a direct payment methods API like Stripe
    // Return empty array or implement based on Razorpay's API
    return []
  }

  normalizeStatus(providerStatus: string): PaymentStatus | SubscriptionStatus {
    return this.normalizePaymentStatus(providerStatus) || this.normalizeSubscriptionStatus(providerStatus)
  }

  private normalizePaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'created': 'pending',
      'authorized': 'processing',
      'captured': 'succeeded',
      'refunded': 'refunded',
      'failed': 'failed',
    }
    return statusMap[status] || 'pending'
  }

  private normalizeSubscriptionStatus(status: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
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

  private async getOrCreatePlan(planType: PlanType, billingPeriod: BillingPeriod): Promise<string> {
    // Check if plan exists in Razorpay
    // If not, create it
    // This should be done during setup, but we'll check here too
    
    const planName = `${planType}_${billingPeriod}`
    const amount = this.getPlanAmount(planType, billingPeriod)
    const interval = billingPeriod === 'yearly' ? 12 : 1

    try {
      const plans = await this.razorpay.plans.all({ count: 100 })
      const existingPlan = plans.items.find(p => p.item.name === planName)
      
      if (existingPlan) {
        return existingPlan.id
      }

      // Create new plan (Razorpay always uses INR)
      const plan = await this.razorpay.plans.create({
        period: 'monthly',
        interval: interval,
        item: {
          name: planName,
          amount: Math.round(amount * 100), // Amount in paise
          currency: 'INR', // Razorpay requires INR for UPI/Net Banking
          description: `${planType} plan - ${billingPeriod}`,
        },
        notes: {
          planType,
          billingPeriod,
        },
      })

      return plan.id
    } catch (error) {
      throw new Error(`Failed to get/create plan: ${error}`)
    }
  }

  private getPlanAmount(planType: PlanType, billingPeriod: BillingPeriod): number {
    const prices: Record<string, number> = {
      'spark_monthly': 10,
      'spark_yearly': 80,
      'flame_monthly': 25,
      'flame_yearly': 200,
      'superflame_monthly': 35,
      'superflame_yearly': 300,
    }
    return prices[`${planType}_${billingPeriod}`] || 0
  }

  private mapRazorpaySubscription(subscription: any): Subscription {
    return {
      id: subscription.id,
      userId: subscription.notes?.userId || '',
      planType: subscription.notes?.planType as PlanType || 'basic',
      billingPeriod: subscription.notes?.billingPeriod as BillingPeriod || 'monthly',
      status: this.normalizeSubscriptionStatus(subscription.status),
      provider: 'razorpay',
      providerSubscriptionId: subscription.id,
      providerCustomerId: subscription.customer_id || '',
      startDate: new Date(subscription.created_at * 1000),
      endDate: subscription.end_at ? new Date(subscription.end_at * 1000) : undefined,
      nextBillingDate: subscription.current_end ? new Date(subscription.current_end * 1000) : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_cycle_end || false,
      metadata: subscription.notes || {},
    }
  }
}
