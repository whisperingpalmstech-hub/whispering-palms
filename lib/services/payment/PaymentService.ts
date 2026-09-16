/**
 * Unified Payment Service - Abstraction layer for multiple payment providers
 */

import { PaymentProviderInterface, PaymentProvider, CreatePaymentIntentParams, CreateSubscriptionParams, PaymentIntent, Subscription } from './types'
import { StripeProvider } from './providers/StripeProvider'

export class PaymentService {
  private providers: Map<PaymentProvider, PaymentProviderInterface>

  constructor() {
    this.providers = new Map()
    
    // Initialize providers based on environment variables
    if (process.env.STRIPE_SECRET_KEY) {
      this.providers.set('stripe', new StripeProvider())
    }
    
    
  }

  /**
   * Get a specific payment provider
   */
  getProvider(provider: PaymentProvider): PaymentProviderInterface {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new Error(`Payment provider ${provider} is not configured`)
    }
    return providerInstance
  }

  /**
   * Get default provider based on user preference or configuration
   */
  getDefaultProvider(): PaymentProvider {
    // Stripe is the only provider.
    if (this.providers.has('stripe')) return 'stripe'
    throw new Error('No payment provider is configured')
  }

  /**
   * Create payment intent with automatic provider selection
   */
  async createPaymentIntent(
    params: CreatePaymentIntentParams,
    preferredProvider?: PaymentProvider
  ): Promise<PaymentIntent> {
    const provider = preferredProvider || this.getDefaultProvider()
    return this.getProvider(provider).createPaymentIntent(params)
  }

  /**
   * Create subscription with automatic provider selection
   */
  async createSubscription(
    params: CreateSubscriptionParams,
    preferredProvider?: PaymentProvider
  ): Promise<Subscription> {
    const provider = preferredProvider || this.getDefaultProvider()
    return this.getProvider(provider).createSubscription(params)
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    provider: PaymentProvider,
    reason?: string
  ): Promise<Subscription> {
    return this.getProvider(provider).cancelSubscription(subscriptionId, reason)
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    provider: PaymentProvider,
    updates: Partial<Pick<Subscription, 'planType' | 'billingPeriod'>>
  ): Promise<Subscription> {
    return this.getProvider(provider).updateSubscription(subscriptionId, updates)
  }

  /**
   * Get subscription
   */
  async getSubscription(
    subscriptionId: string,
    provider: PaymentProvider
  ): Promise<Subscription | null> {
    return this.getProvider(provider).getSubscription(subscriptionId)
  }

  /**
   * Handle webhook from any provider
   */
  async handleWebhook(
    provider: PaymentProvider,
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    const providerInstance = this.getProvider(provider)
    const secret = this.getWebhookSecret(provider)
    
    if (!providerInstance.verifyWebhookSignature(payload, signature, secret)) {
      throw new Error('Invalid webhook signature')
    }

    // Parse webhook event based on provider
    const event = this.parseWebhookEvent(provider, payload)
    await providerInstance.handleWebhook(event)
  }

  /**
   * Get available payment providers
   */
  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.providers.keys())
  }

  private getWebhookSecret(provider: PaymentProvider): string {
    switch (provider) {
      case 'stripe':
        return process.env.STRIPE_WEBHOOK_SECRET || ''
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  private parseWebhookEvent(provider: PaymentProvider, payload: string | Buffer): any {
    // This will be implemented by each provider
    // For now, return raw payload
    return typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString())
  }
}

// Singleton instance
let paymentServiceInstance: PaymentService | null = null

export function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService()
  }
  return paymentServiceInstance
}
