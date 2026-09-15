/**
 * POST /api/email/send
 * Send pending emails (called by cron job or scheduled task)
 * For PoC, this can be called manually or via a simple scheduler
 *
 * Transport lives in lib/services/mailer.ts and is shared with Supabase Auth,
 * which is configured to relay through the same SMTP host. See docs/EMAIL_SETUP.md.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCronAuth } from '@/lib/auth/cron'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import { generateAnswerEmail } from '@/lib/services/email'
import { getEmailProvider, getMailerStatus, sendMail } from '@/lib/services/mailer'

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const { messageId, provider } = await sendMail({ to, subject, html })
  console.log(`✅ Email sent via ${provider}:`, messageId)
}

export async function POST(request: NextRequest) {
  // Was reachable by anyone: no session, no secret, and excluded from the
  // middleware matcher. See lib/auth/cron.ts.
  const denied = requireCronAuth(request)
  if (denied) return denied

  try {
    const emailProvider = getEmailProvider()
    const mailerStatus = getMailerStatus()

    console.log('🔍 Email transport:', JSON.stringify(mailerStatus))

    if (!mailerStatus.configured) {
      return createErrorResponse(
        `Email provider "${emailProvider}" is not fully configured. Check SMTP_HOST/SMTP_USER/SMTP_PASSWORD and EMAIL_FROM in your environment.`,
        500
      )
    }

    console.log('  EMAIL_TEST_MODE:', process.env.EMAIL_TEST_MODE || 'false')

    const supabase = createAdminClient()
    const now = new Date()

    // Get all pending emails that are due for delivery
    const { data: answers, error: fetchError } = await supabase
      .from('answers')
      .select(`
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
      `)
      .not('email_metadata', 'is', null)

    if (fetchError) {
      console.error('Error fetching pending emails:', fetchError)
      return createErrorResponse('Failed to fetch pending emails', 500)
    }

    if (!answers || answers.length === 0) {
      return createSuccessResponse({
        sent: 0,
        message: 'No pending emails',
      })
    }

    let sentCount = 0
    const errors: string[] = []

    for (const answer of answers) {
      const emailMetadata = answer.email_metadata as any
      if (!emailMetadata || emailMetadata.status !== 'pending') continue

      // Check if email is due for delivery
      const deliveryTime = new Date(emailMetadata.delivery_time)
      // Ignored in production: a Basic user must still wait 24 hours.
      const isTestMode =
        process.env.EMAIL_TEST_MODE === 'true' && process.env.NODE_ENV !== 'production'
      const isGmailProvider = emailProvider === 'gmail'

      // Gmail SMTP: Always send immediately (testing mode)
      // Zoho/Resend: Respect delivery time unless test mode is enabled
      if (isGmailProvider) {
        // Gmail SMTP - always send immediately for testing
        console.log(`📧 Gmail SMTP: Sending email immediately (scheduled for ${deliveryTime.toISOString()})`)
      } else if (!isTestMode && now < deliveryTime) {
        // Production mode: respect scheduled delivery time
        continue
      } else if (isTestMode && now < deliveryTime) {
        // Test mode: send immediately
        console.log(`🧪 TEST MODE: Sending email immediately (scheduled for ${deliveryTime.toISOString()})`)
      }

      const question = (answer.questions as any)
      const userId = answer.user_id

      if (!question || !userId) {
        errors.push(`Missing data for answer ${answer.id}`)
        continue
      }

      // Get user data
      const { data: userData } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .single()

      if (!userData) {
        errors.push(`User not found for answer ${answer.id}`)
        continue
      }

      try {
        // Generate email HTML
        const emailHtml = generateAnswerEmail({
          userName: userData.name,
          userEmail: userData.email,
          question: question.text_original,
          answer: (emailMetadata.plan_type === 'flame' || emailMetadata.plan_type === 'superflame') ? '' : answer.text,
          planType: emailMetadata.plan_type,
          audioUrl: emailMetadata.audio_url,
          questionId: question.id,
          answerId: answer.id,
        })

        // Send email
        await sendEmail(
          userData.email,
          'Your Personal Reading from Whispering Palms',
          emailHtml
        )


        // Update answer email metadata to sent
        const sentAt = new Date().toISOString()
        await supabase
          .from('answers')
          .update({
            email_metadata: {
              ...emailMetadata,
              status: 'sent',
              sent_at: sentAt,
            },
          })
          .eq('id', answer.id)

        // Update question status to 'sent' and set email_sent_at
        await supabase
          .from('questions')
          .update({
            status: 'sent',
            email_sent_at: sentAt,
          })
          .eq('id', question.id)

        sentCount++
      } catch (error) {
        console.error(`Error sending email for answer ${answer.id}:`, error)
        errors.push(`Failed to send email for answer ${answer.id}`)
      }
    }

    return createSuccessResponse({
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Sent ${sentCount} email(s)`,
    })
  } catch (error) {
    console.error('Error in POST /api/email/send:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}
