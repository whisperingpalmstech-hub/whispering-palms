/**
 * Canonical subscription pricing.
 *
 * The only source of truth for what a plan costs. create-intent/route.ts used
 * to accept the price from the client (`amount || planPrices[...]`), which let
 * anyone request an arbitrary charge amount for any plan. It also kept its own
 * copy of these numbers that had drifted from the pricing page (Superflame
 * yearly was $300 here, $280 there). Both problems share one fix: one exported
 * table, and callers never trust a client-supplied amount.
 *
 * Keep in sync with the plan cards in app/subscription/page.tsx - that file
 * owns the marketing copy and feature lists, this file owns the number that
 * actually gets charged.
 */

export type PaidPlanType = 'spark' | 'flame' | 'superflame'
export type BillingPeriod = 'monthly' | 'yearly'

/** USD price for each paid plan. 'basic' (Free) has no checkout - $0. */
export const PLAN_PRICES: Record<PaidPlanType, Record<BillingPeriod, number>> = {
  spark: { monthly: 9, yearly: 72 },
  flame: { monthly: 22, yearly: 176 },
  superflame: { monthly: 39, yearly: 312 },
}

export function isPaidPlanType(value: string): value is PaidPlanType {
  return value === 'spark' || value === 'flame' || value === 'superflame'
}

export function isBillingPeriod(value: string): value is BillingPeriod {
  return value === 'monthly' || value === 'yearly'
}

/** The server-computed price, or null when planType/billingPeriod is not real. */
export function getPlanPrice(planType: string, billingPeriod: string): number | null {
  if (!isPaidPlanType(planType) || !isBillingPeriod(billingPeriod)) return null
  return PLAN_PRICES[planType][billingPeriod]
}
