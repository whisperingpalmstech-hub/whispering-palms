/**
 * Plan activation — the single place that grants a user a plan.
 *
 * Paid plans must ONLY ever be granted here, called from a server route that
 * has independently verified money changed hands:
 *   - Stripe: webhook (checkout.session.completed / subscription events)
 *             or verify-session (Stripe session retrieved server-side)
 *   - Razorpay: /api/payments/verify (HMAC signature checked server-side)
 *                 or the Razorpay webhook (payment.captured)
 *
 * The old flow called PUT /api/subscription/update straight from the browser
 * after checkout, which meant anyone could grant themselves Superflame with a
 * single curl and no payment. That endpoint now only allows downgrading to
 * the free `basic` plan.
 *
 * Quota defaults here mirror lib/services/quota.ts (2/6/12/60) with the same
 * env overrides, so a freshly activated plan and the quota service agree.
 */

export type PlanType = 'basic' | 'spark' | 'flame' | 'superflame'

export function isPlanType(value: unknown): value is PlanType {
  return (
    value === 'basic' ||
    value === 'spark' ||
    value === 'flame' ||
    value === 'superflame'
  )
}

export function maxQuestionsForPlan(planType: PlanType): number {
  switch (planType) {
    case 'basic':
      return parseInt(process.env.BASIC_MAX_QUESTIONS || '2', 10)
    case 'spark':
      return parseInt(process.env.SPARK_MAX_QUESTIONS || '6', 10)
    case 'flame':
      return parseInt(process.env.FLAME_MAX_QUESTIONS || '12', 10)
    case 'superflame':
      // Marketed as "Unlimited" but soft-capped: a literal unbounded quota has
      // no defence against one account hammering the LLM/TTS pipeline all day.
      return parseInt(process.env.SUPERFLAME_MAX_QUESTIONS || '60', 10)
  }
}

function midnightTomorrow(): string {
  const resetAt = new Date()
  resetAt.setDate(resetAt.getDate() + 1)
  resetAt.setHours(0, 0, 0, 0)
  return resetAt.toISOString()
}

/**
 * Grant `planType` to `userId`: updates the profile and reconciles today's
 * quota row, preserving questions already used today. Idempotent — safe to
 * call from both a webhook and a verify route for the same payment.
 *
 * `db` may be the service-role client (webhooks, no user session) or the
 * request-scoped client (verify routes, where the caller only ever touches
 * their own rows, which the owner RLS policies allow).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function activatePlan(
  db: { from: (t: string) => any },
  userId: string,
  planType: PlanType
): Promise<void> {
  const maxQuestions = maxQuestionsForPlan(planType)
  const today = new Date().toISOString().split('T')[0]

  const { error: profileError } = await db
    .from('user_profiles')
    .update({
      subscription_plan: planType,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (profileError) {
    throw new Error(`Could not update plan: ${profileError.message}`)
  }

  const { data: existingQuota } = await db
    .from('daily_quotas')
    .select('id, max_questions, remaining_questions')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existingQuota) {
    const used = Math.max(
      (existingQuota.max_questions ?? maxQuestions) -
        (existingQuota.remaining_questions ?? 0),
      0
    )
    const { error: quotaError } = await db
      .from('daily_quotas')
      .update({
        plan_type: planType,
        max_questions: maxQuestions,
        remaining_questions: Math.max(maxQuestions - used, 0),
        reset_at: midnightTomorrow(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingQuota.id)

    if (quotaError) {
      console.error('Plan activated but quota reconcile failed:', quotaError)
    }
  } else {
    const { error: quotaError } = await db.from('daily_quotas').insert({
      user_id: userId,
      date: today,
      plan_type: planType,
      max_questions: maxQuestions,
      remaining_questions: maxQuestions,
      reset_at: midnightTomorrow(),
    })

    if (quotaError) {
      console.error('Plan activated but quota creation failed:', quotaError)
    }
  }
}
