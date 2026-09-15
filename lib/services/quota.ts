/**
 * Quota Service
 * Handles daily quota calculation, validation, and management
 */

import { createClient } from '@/lib/supabase/server'

interface QuotaConfig {
  basic: {
    maxQuestions: number
  }
  spark: {
    maxQuestions: number
  }
  flame: {
    maxQuestions: number
  }
  superflame: {
    maxQuestions: number // Unlimited = -1 or very large number
  }
}

interface DailyQuota {
  user_id: string
  date: string
  plan_type: 'basic' | 'spark' | 'flame' | 'superflame'
  max_questions: number
  remaining_questions: number
  reset_at: string
}

class QuotaService {
  private config: QuotaConfig

  constructor() {
    // Quota limits per plan.
    // 'basic' is the free tier (displayed as "Free" - see lib/i18n plan.free).
    // Superflame is marketed as "Unlimited" but soft-capped: an actual unbounded
    // quota has no defence against one account hammering the LLM/TTS pipeline
    // all day. 60/day is far beyond any real usage pattern.
    this.config = {
      basic: {
        maxQuestions: parseInt(process.env.BASIC_MAX_QUESTIONS || '2', 10),
      },
      spark: {
        maxQuestions: parseInt(process.env.SPARK_MAX_QUESTIONS || '6', 10),
      },
      flame: {
        maxQuestions: parseInt(process.env.FLAME_MAX_QUESTIONS || '12', 10),
      },
      superflame: {
        maxQuestions: parseInt(process.env.SUPERFLAME_MAX_QUESTIONS || '60', 10),
      },
    }
  }

  /**
   * Get or create daily quota for user
   */
  async getDailyQuota(userId: string, planType: 'basic' | 'spark' | 'flame' | 'superflame' = 'basic'): Promise<DailyQuota> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Try to get existing quota for today
    const { data: existingQuota, error: fetchError } = await supabase
      .from('daily_quotas')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (existingQuota && !fetchError) {
      // Check if quota needs reset (past reset_at time)
      const resetAt = new Date(existingQuota.reset_at)
      const now = new Date()

      if (now > resetAt) {
        // Reset quota for new day
        return this.resetQuota(userId, planType)
      }

      const maxQuestions = this.getPersistedMaxQuestions(planType)

      // Reconcile quota when the user's plan changed or the plan allowance changed.
      if (existingQuota.plan_type !== planType || existingQuota.max_questions !== maxQuestions) {
        console.log(`⚠️ Plan mismatch detected. Updating quota from ${existingQuota.plan_type} to ${planType}`)

        // Update quota with new plan
        const { data: updatedQuota, error: updateError } = await supabase
          .from('daily_quotas')
          .update({
            plan_type: planType,
            max_questions: maxQuestions,
            remaining_questions: this.reconcileRemainingQuestions(existingQuota, maxQuestions),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingQuota.id)
          .select()
          .single()

        if (updateError || !updatedQuota) {
          console.error('Error updating quota plan type:', updateError)
          // Fall through to create new quota
        } else {
          return updatedQuota as DailyQuota
        }
      }

      return existingQuota as DailyQuota
    }

    // Create new quota for today
    const maxQuestions = this.getPersistedMaxQuestions(planType)
    const resetAt = this.calculateResetTime()

    const { data: newQuota, error: createError } = await supabase
      .from('daily_quotas')
      .insert({
        user_id: userId,
        date: today,
        plan_type: planType,
        max_questions: maxQuestions,
        remaining_questions: maxQuestions,
        reset_at: resetAt.toISOString(),
      })
      .select()
      .single()

    if (createError || !newQuota) {
      throw new Error(`Failed to create daily quota: ${createError?.message || 'Unknown error'}`)
    }

    return newQuota as DailyQuota
  }

  /**
   * Check if user has remaining quota
   */
  async hasQuota(userId: string, planType: 'basic' | 'spark' | 'flame' | 'superflame' = 'basic'): Promise<boolean> {
    // SuperFlame has unlimited questions
    if (planType === 'superflame') {
      return true
    }
    const quota = await this.getDailyQuota(userId, planType)
    return quota.remaining_questions > 0
  }

  /**
   * Validate quota before question submission
   */
  async validateQuota(userId: string, planType: 'basic' | 'spark' | 'flame' | 'superflame' = 'basic'): Promise<{
    valid: boolean
    remaining: number
    message?: string
  }> {
    // SuperFlame has unlimited questions
    if (planType === 'superflame') {
      return {
        valid: true,
        remaining: 999999, // Show as unlimited
      }
    }

    const quota = await this.getDailyQuota(userId, planType)

    if (quota.remaining_questions <= 0) {
      return {
        valid: false,
        remaining: 0,
        message: `Daily quota exhausted. You have used all ${quota.max_questions} questions for today. Quota will reset at ${new Date(quota.reset_at).toLocaleTimeString()}`,
      }
    }

    return {
      valid: true,
      remaining: quota.remaining_questions,
    }
  }

  /**
   * Consume quota (decrement remaining questions)
   */
  async consumeQuota(userId: string, planType: 'basic' | 'spark' | 'flame' | 'superflame' = 'basic'): Promise<{
    success: boolean
    remaining: number
    error?: string
  }> {
    // SuperFlame has unlimited questions - no need to consume
    if (planType === 'superflame') {
      return {
        success: true,
        remaining: 999999,
      }
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // Get current quota
    const { data: quota, error: fetchError } = await supabase
      .from('daily_quotas')
      .select('remaining_questions')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (fetchError || !quota) {
      // Create quota if doesn't exist
      await this.getDailyQuota(userId, planType)
      return this.consumeQuota(userId, planType)
    }

    if (quota.remaining_questions <= 0) {
      return {
        success: false,
        remaining: 0,
        error: 'No remaining quota',
      }
    }

    // Decrement quota
    const { data: updated, error: updateError } = await supabase
      .from('daily_quotas')
      .update({
        remaining_questions: quota.remaining_questions - 1,
      })
      .eq('user_id', userId)
      .eq('date', today)
      .select('remaining_questions')
      .single()

    if (updateError || !updated) {
      return {
        success: false,
        remaining: quota.remaining_questions,
        error: updateError?.message || 'Failed to update quota',
      }
    }

    return {
      success: true,
      remaining: updated.remaining_questions,
    }
  }

  /**
   * Reset quota for new day
   */
  private async resetQuota(
    userId: string,
    planType: 'basic' | 'spark' | 'flame' | 'superflame' = 'basic'
  ): Promise<DailyQuota> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const maxQuestions = this.getPersistedMaxQuestions(planType)
    const resetAt = this.calculateResetTime()

    const { data: updated, error: updateError } = await supabase
      .from('daily_quotas')
      .upsert(
        {
          user_id: userId,
          date: today,
          plan_type: planType,
          max_questions: maxQuestions,
          remaining_questions: maxQuestions,
          reset_at: resetAt.toISOString(),
        },
        {
          onConflict: 'user_id,date',
        }
      )
      .select()
      .single()

    if (updateError || !updated) {
      throw new Error(`Failed to reset quota: ${updateError?.message || 'Unknown error'}`)
    }

    return updated as DailyQuota
  }

  /**
   * Calculate reset time (midnight in user's timezone or UTC)
   */
  private calculateResetTime(): Date {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0) // Midnight
    return tomorrow
  }

  private getPersistedMaxQuestions(planType: 'basic' | 'spark' | 'flame' | 'superflame'): number {
    const configuredMaxQuestions = this.config[planType].maxQuestions
    return configuredMaxQuestions === -1 ? 999999 : configuredMaxQuestions
  }

  private reconcileRemainingQuestions(
    existingQuota: Pick<DailyQuota, 'max_questions' | 'remaining_questions'>,
    maxQuestions: number
  ): number {
    const usedQuestions = Math.max(
      (existingQuota.max_questions || maxQuestions) - (existingQuota.remaining_questions || 0),
      0
    )

    return Math.max(maxQuestions - usedQuestions, 0)
  }

  /**
   * Get quota status for user
   */
  async getQuotaStatus(userId: string, planType: 'basic' | 'spark' | 'flame' | 'superflame' = 'basic'): Promise<{
    used: number
    remaining: number
    max: number
    resetAt: string
    percentage: number
  }> {
    // SuperFlame has unlimited questions
    if (planType === 'superflame') {
      return {
        used: 0,
        remaining: 999999,
        max: -1, // -1 means unlimited
        resetAt: new Date().toISOString(),
        percentage: 0,
      }
    }

    const quota = await this.getDailyQuota(userId, planType)

    return {
      used: quota.max_questions - quota.remaining_questions,
      remaining: quota.remaining_questions,
      max: quota.max_questions,
      resetAt: quota.reset_at,
      percentage: Math.round(
        ((quota.max_questions - quota.remaining_questions) / quota.max_questions) * 100
      ),
    }
  }
}

export const quotaService = new QuotaService()
export type { DailyQuota }
