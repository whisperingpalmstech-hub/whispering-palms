/**
 * Unified payment service types and interfaces
 */

/** Stripe is the only payment provider. One platform, one webhook, one dashboard. */
export type PaymentProvider = 'stripe'

export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'succeeded' 
  | 'failed' 
  | 'canceled' 
  | 'refunded'
  | 'partially_refunded'

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'incomplete'
  | 'incomplete_expired'

export type PlanType = 'basic' | 'spark' | 'flame' | 'superflame'

export type BillingPeriod = 'monthly' | 'yearly'

export interface PaymentIntent {
  id: string
  provider: PaymentProvider
  amount: number
  currency: string
  status: PaymentStatus
  clientSecret?: string
  paymentMethodId?: string
  metadata?: Record<string, string>
}

export interface Subscription {
  id: string
  userId: string
  planType: PlanType
  billingPeriod: BillingPeriod
  status: SubscriptionStatus
  provider: PaymentProvider
  providerSubscriptionId: string
  providerCustomerId: string
  startDate: Date
  endDate?: Date
  nextBillingDate?: Date
  cancelAtPeriodEnd?: boolean
  metadata?: Record<string, any>
}

export interface CreatePaymentIntentParams {
  userId: string
  amount: number
  currency: string
  planType: PlanType
  billingPeriod: BillingPeriod
  metadata?: Record<string, string>
}

export interface CreateSubscriptionParams {
  userId: string
  planType: PlanType
  billingPeriod: BillingPeriod
  paymentMethodId: string
  metadata?: Record<string, string>
}

export interface WebhookEvent {
  id: string
  type: string
  provider: PaymentProvider
  data: any
  timestamp: Date
}

export interface PaymentProviderInterface {
  /**
   * Create a payment intent for one-time or subscription payment
   */
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent>

  /**
   * Create a subscription
   */
  createSubscription(params: CreateSubscriptionParams): Promise<Subscription>

  /**
   * Cancel a subscription
   */
  cancelSubscription(subscriptionId: string, reason?: string): Promise<Subscription>

  /**
   * Update subscription (change plan, billing period, etc.)
   */
  updateSubscription(
    subscriptionId: string,
    updates: Partial<Pick<Subscription, 'planType' | 'billingPeriod'>>
  ): Promise<Subscription>

  /**
   * Get subscription details
   */
  getSubscription(subscriptionId: string): Promise<Subscription | null>

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): boolean

  /**
   * Handle webhook event
   */
  handleWebhook(event: WebhookEvent): Promise<void>

  /**
   * Get customer payment methods
   */
  getPaymentMethods(customerId: string): Promise<any[]>

  /**
   * Normalize provider-specific status to our standard status
   */
  normalizeStatus(providerStatus: string): PaymentStatus | SubscriptionStatus
}
