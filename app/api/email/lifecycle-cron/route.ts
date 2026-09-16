import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import { sendEmail } from '@/lib/services/email-sender'

// Type definitions for the campaigns
type CampaignType = 'onboarding_reminders' | 'first_question_reminders' | 'limit_exhausted_reminders'

interface LifecycleUser {
    user_id: string
    email: string
    name: string | null
    signup_date: string
    is_email_verified: boolean
    notifications_enabled: boolean
    has_birth_details: boolean
    has_palm_uploaded: boolean
    is_onboarded: boolean
    onboarding_completed_at: string | null
    question_count: number
    plan_type: string
    is_daily_limit_reached: boolean
    current_quota_date: string
    last_activity_timestamp: string
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const now = new Date()
        let emailsSent = 0
        const errors: string[] = []

        // Fetch the lifecycle state
        const { data: users, error: fetchError } = await supabase
            .from('user_lifecycle_state')
            .select('*')

        if (fetchError) {
            console.error('Error fetching user lifecycle state:', fetchError)
            return createErrorResponse('Failed to fetch user lifecycle state', 500)
        }

        if (!users || users.length === 0) {
            return createSuccessResponse({ sent: 0, message: 'No users found' })
        }

        // Process each user
        for (const user of users as LifecycleUser[]) {
            if (user.notifications_enabled === false) continue

            // SCENARIO 1: User Signed Up But Did NOT Onboard
            if (user.is_email_verified !== false && !user.is_onboarded) {
                const signupDate = new Date(user.signup_date)
                const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24))

                if (daysSinceSignup >= 1) {
                    let step = 0
                    let subject = ''
                    let content = ''

                    if (daysSinceSignup === 1) {
                        step = 1
                        subject = '✋ Your future is waiting… Complete your Vaar onboarding'
                        content = `
              <p>Hello ${user.name || 'Seeker'},</p>
              <p>Your future insights are waiting for you! We noticed you haven't completed your onboarding yet.</p>
              <p>By simply uploading your palm images and entering your birth details, you will unlock personalized astrology and palmistry insights specifically tailored for your love life, career, and destiny.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background-color:#d4af37;color:white;text-decoration:none;border-radius:4px;margin-top:20px;">Complete Your Onboarding</a>
            `
                    } else if (daysSinceSignup === 3) {
                        step = 2
                        subject = '🌙 Don’t miss your personalized destiny insights'
                        content = `
              <p>Hello ${user.name || 'Seeker'},</p>
              <p>Are you curious about what your palm says about your love life or career? Your personalized destiny insights are just a step away.</p>
              <p>Don't miss the opportunity to understand your true path based on your unique celestial imprint.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background-color:#d4af37;color:white;text-decoration:none;border-radius:4px;margin-top:20px;">Discover Your Future</a>
            `
                    } else if (daysSinceSignup >= 5 && daysSinceSignup < 7) {
                        step = 3
                        subject = '🔮 Your personalized astrology is still pending'
                        content = `
              <p>Hello ${user.name || 'Seeker'},</p>
              <p>This is your final reminder! Your personalized astrology and palmistry insights are still pending. The stars have aligned to offer you clarity.</p>
              <p>Act now to unlock your detailed reading before this energy passes.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;padding:12px 24px;background-color:#d4af37;color:white;text-decoration:none;border-radius:4px;margin-top:20px;">Unlock Insights Now</a>
            `
                    }

                    if (step > 0) {
                        const sent = await processCampaign(supabase, user, 'onboarding_reminders', step, subject, content)
                        if (sent) emailsSent++
                    }
                }
            }

            // SCENARIO 2: User Onboarded But Has NOT Asked Questions
            if (user.is_onboarded && user.question_count === 0 && user.onboarding_completed_at) {
                const onboardingDate = new Date(user.onboarding_completed_at)
                const daysSinceOnboarding = Math.floor((now.getTime() - onboardingDate.getTime()) / (1000 * 60 * 60 * 24))

                if (daysSinceOnboarding >= 1) {
                    let step = 0
                    let subject = ''
                    let content = ''

                    if (daysSinceOnboarding === 1) {
                        step = 1
                        subject = '💫 Ask your first question about your future'
                        content = `
              <p>Hello ${user.name || 'Seeker'},</p>
              <p>You are fully onboarded and ready to seek clarity. Ask your first question now!</p>
              <p><b>Need ideas?</b><br>
                - "When will I get married?"<br>
                - "Is this year good for career growth?"<br>
                - "Should I switch jobs?"
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/chat" style="display:inline-block;padding:12px 24px;background-color:#d4af37;color:white;text-decoration:none;border-radius:4px;margin-top:20px;">Ask Your First Question</a>
            `
                    } else if (daysSinceOnboarding === 3) {
                        step = 2
                        subject = '❤️ Curious about your love life?'
                        content = `
              <p>Hello ${user.name || 'Seeker'},</p>
              <p>What secrets does your palm hold about your true love and relationships?</p>
              <p>Don't hold back. Our AI astrologer is here to provide you deeply personal emotional insights based on your unique birth details and palm lines.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/chat" style="display:inline-block;padding:12px 24px;background-color:#d4af37;color:white;text-decoration:none;border-radius:4px;margin-top:20px;">Ask About Love</a>
            `
                    } else if (daysSinceOnboarding >= 5 && daysSinceOnboarding < 7) {
                        step = 3
                        subject = '🌟 Your destiny insights are waiting'
                        content = `
              <p>Hello ${user.name || 'Seeker'},</p>
              <p>We're missing you! Remember that you have a daily question limit available for free. Why let it go to waste?</p>
              <p>Dive deep into your destiny today and get the answers you deserve.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/chat" style="display:inline-block;padding:12px 24px;background-color:#d4af37;color:white;text-decoration:none;border-radius:4px;margin-top:20px;">Use Your Free Question</a>
            `
                    }

                    if (step > 0) {
                        const sent = await processCampaign(supabase, user, 'first_question_reminders', step, subject, content)
                        if (sent) emailsSent++
                    }
                }
            }

            // SCENARIO 3: User Exhausted Free Daily Limit (Basic Plan Over)
            if (user.plan_type === 'basic' && user.is_daily_limit_reached && user.last_activity_timestamp) {
                const lastActivityDate = new Date(user.last_activity_timestamp)
                const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))

                if (daysSinceActivity >= 2) {
                    let step = 0
                    let subject = ''
                    let content = ''

                    if (daysSinceActivity === 2) {
                        step = 1
                        subject = '🔓 Unlock unlimited destiny insights'
                        content = `
              <p>Hello ${user.name || 'Seeker'},</p>
              <p>You asked excellent questions, but you've reached the free limit. Why stop there?</p>
              <p>Upgrade your plan today to unlock:<br>
                - More daily questions<br>
                - Advanced palm reading<br>
                - Vaar personalized video insights
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscription" style="display:inline-block;padding:12px 24px;background-color:#d4af37;color:white;text-decoration:none;border-radius:4px;margin-top:20px;">Upgrade Now</a>
            `
                    } else if (daysSinceActivity === 4) {
                        step = 2
                        subject = '🌙 Your next answer is waiting…'
                        content = `
              <p>Hello ${user.name || 'Seeker'},</p>
              <p>Have new questions arisen about your career or love life? Don't leave your doubts unanswered.</p>
              <p>Unlock premium insights today and take charge of your opportunities before they slip away.</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscription" style="display:inline-block;padding:12px 24px;background-color:#d4af37;color:white;text-decoration:none;border-radius:4px;margin-top:20px;">Continue Your Journey</a>
            `
                    } else if (daysSinceActivity >= 7 && daysSinceActivity < 9) {
                        step = 3
                        subject = '✨ Upgrade & go deeper into your destiny'
                        content = `
              <p>Hello ${user.name || 'Seeker'},</p>
              <p>Step onto the deeper path of self-discovery. Upgrading your account opens doors to the universe's greatest secrets about YOU.</p>
              <p>Are you ready for continuous, unrestricted access to your personal spiritual guide?</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscription" style="display:inline-block;padding:12px 24px;background-color:#d4af37;color:white;text-decoration:none;border-radius:4px;margin-top:20px;">Upgrade Your Plan</a>
            `
                    }

                    if (step > 0) {
                        const sent = await processCampaign(supabase, user, 'limit_exhausted_reminders', step, subject, content)
                        if (sent) emailsSent++
                    }
                }
            }
        }

        return createSuccessResponse({
            sent: emailsSent,
            message: `Sent ${emailsSent} lifecycle email(s)`,
        })
    } catch (error) {
        console.error('Error in GET /api/email/lifecycle-cron:', error)
        return createErrorResponse(error instanceof Error ? error.message : 'Internal server error', 500)
    }
}

async function processCampaign(
    supabase: any,
    user: LifecycleUser,
    campaignType: CampaignType,
    step: number,
    subject: string,
    content: string
): Promise<boolean> {
    // Check if we already sent this step to this user
    const { data: existingLog } = await supabase
        .from('email_campaign_logs')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('campaign_type', campaignType)
        .eq('email_step', step)
        .single()

    if (existingLog) return false // Already sent

    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; background-color: #f5f5f0; line-height: 1.6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f0; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; padding: 40px;">
              <tr>
                <td style="text-align: center; border-bottom: 2px solid #d4af37; padding-bottom: 20px;">
                  <h1 style="margin: 0; color: #333333; font-size: 26px;">Whispering Palms</h1>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 30px; color: #333333; font-size: 16px;">
                  ${content}
                </td>
              </tr>
              <tr>
                <td style="padding-top: 40px; border-top: 1px solid #eeeeee; text-align: center; margin-top: 30px;">
                  <p style="margin: 0; color: #999999; font-size: 12px;">May the stars guide your path</p>
                  <p style="margin: 0; color: #999999; font-size: 11px; margin-top:5px;">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color:#d4af37;">Unsubscribe</a> from these reminders.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

    try {
        await sendEmail(user.email, subject, htmlTemplate)

        // Record that we sent the email
        await supabase.from('email_campaign_logs').insert({
            user_id: user.user_id,
            campaign_type: campaignType,
            email_step: step
        })

        return true
    } catch (err) {
        console.error(`Failed to send ${campaignType} step ${step} to ${user.email}:`, err)
        return false
    }
}
