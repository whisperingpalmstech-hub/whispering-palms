/**
 * GET /api/email/cron
 *
 * Delivers reading emails whose scheduled time has arrived. Called every minute
 * by an external cron service.
 *
 * Three things were wrong here before:
 *
 *  1. No authentication. Anyone could call it repeatedly and flush every
 *     pending reading. Now requires CRON_SECRET.
 *  2. It carried its own copy of the Resend/Zoho/Gmail sending code and was
 *     missed when the app moved to lib/services/mailer. With the relay switched
 *     to ZeptoMail it would have failed on every send. Now uses the shared
 *     mailer.
 *  3. It read the database with the anon client and no session. Once Row Level
 *     Security is enabled that returns zero rows, so no reading would ever be
 *     delivered. Now uses the service role, which is correct for a machine job
 *     that legitimately crosses user boundaries.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import { generateAnswerEmail } from '@/lib/services/email'
import { getMailerStatus, sendMail } from '@/lib/services/mailer'
import { requireCronAuth } from '@/lib/auth/cron'

/** Safety valve: one run should never send more than this. */
const MAX_PER_RUN = parseInt(process.env.EMAIL_MAX_PER_RUN || '50', 10)

export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request)
  if (denied) return denied

  try {
    const mailer = getMailerStatus()
    if (!mailer.configured) {
      return createErrorResponse(
        `Email provider "${mailer.provider}" is not configured. Check SMTP_HOST/SMTP_USER/SMTP_PASSWORD and EMAIL_FROM.`,
        503
      )
    }

    // Test mode ignores the per-plan delivery delay. That is right locally and
    // wrong in production, where a Basic user would get their reading instantly
    // instead of after 24 hours.
    const isTestMode =
      process.env.EMAIL_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production'

    if (process.env.EMAIL_TEST_MODE === 'true' && process.env.NODE_ENV === 'production') {
      console.warn('[cron] EMAIL_TEST_MODE is set in production and is being ignored.')
    }

    const supabase = createAdminClient()
    const now = new Date()

    const { data: answers, error: fetchError } = await supabase
      .from('answers')
      .select(
        `
        id,
        text,
        text_internal_en,
        email_metadata,
        user_id,
        question_id,
        questions!inner (
          id,
          text_original,
          user_id
        )
      `
      )
      .not('email_metadata', 'is', null)

    if (fetchError) {
      console.error('[cron] Could not read pending emails:', fetchError)
      return createErrorResponse('Failed to fetch pending emails', 500)
    }

    if (!answers || answers.length === 0) {
      return createSuccessResponse({ sent: 0, message: 'No pending emails' })
    }

    let sentCount = 0
    let skipped = 0
    const errors: string[] = []

    for (const answer of answers) {
      if (sentCount >= MAX_PER_RUN) {
        console.warn(`[cron] Reached the ${MAX_PER_RUN} per-run cap; remaining emails wait for the next run.`)
        break
      }

      const emailMetadata = answer.email_metadata as any
      if (!emailMetadata || emailMetadata.status !== 'pending') continue

      const deliveryTime = new Date(emailMetadata.delivery_time)
      if (!isTestMode && now < deliveryTime) {
        skipped++
        continue
      }

      const question = answer.questions as any
      const userId = answer.user_id

      if (!question || !userId) {
        errors.push(`Missing question or user for answer ${answer.id}`)
        continue
      }

      const { data: userData } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single()

      if (!userData?.email) {
        errors.push(`No email address for the user behind answer ${answer.id}`)
        continue
      }

      try {
        const planType = emailMetadata.plan_type
        const emailHtml = generateAnswerEmail({
          userName: userData.name,
          userEmail: userData.email,
          question: question.text_original,
          // Flame and SuperFlame get a link to the narrated playback page
          // instead of the answer text.
          answer: planType === 'flame' || planType === 'superflame' ? '' : answer.text,
          planType,
          audioUrl: emailMetadata.audio_url,
          questionId: question.id,
          answerId: answer.id,
        })

        await sendMail({
          to: userData.email,
          subject: 'Your Personal Reading from Whispering Palms',
          html: emailHtml,
        })

        const sentAt = new Date().toISOString()

        // Mark sent before touching the question, so a failure between the two
        // cannot resend the same reading.
        await supabase
          .from('answers')
          .update({
            email_metadata: { ...emailMetadata, status: 'sent', sent_at: sentAt },
          })
          .eq('id', answer.id)

        await supabase
          .from('questions')
          .update({ status: 'sent', email_sent_at: sentAt })
          .eq('id', question.id)

        sentCount++
        console.log(`[cron] ✅ Sent reading for answer ${answer.id} (${planType})`)
      } catch (error) {
        console.error(`[cron] Failed to send for answer ${answer.id}:`, error)
        errors.push(`Failed to send for answer ${answer.id}`)

        // Record the failure so a permanently broken address does not get
        // retried forever.
        const attempts = (emailMetadata.attempts ?? 0) + 1
        await supabase
          .from('answers')
          .update({
            email_metadata: {
              ...emailMetadata,
              attempts,
              last_error: error instanceof Error ? error.message.slice(0, 300) : 'unknown',
              status: attempts >= 5 ? 'failed' : 'pending',
            },
          })
          .eq('id', answer.id)
      }
    }

    return createSuccessResponse({
      sent: sentCount,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sent ${sentCount} email(s), ${skipped} not yet due`,
    })
  } catch (error) {
    console.error('[cron] Unexpected error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}
