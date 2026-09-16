/**
 * Email Service
 * Handles professional email formatting and delivery for question answers
 */

import { createClient } from '@/lib/supabase/server'

export type PlanType = 'basic' | 'spark' | 'flame' | 'superflame'

interface EmailData {
  userName?: string
  userEmail: string
  question: string
  answer: string
  planType: PlanType
  audioUrl?: string // For Flame plan
  questionId: string
  answerId: string
}

/**
 * Generate professional email HTML for answer delivery
 */
export function generateAnswerEmail(data: EmailData): string {
  const { userName, userEmail, question, answer, planType, audioUrl, answerId } = data
  const greeting = userName ? `Dear ${userName},` : 'Dear Valued Client,'

  // Company logo
  const logoUrl = process.env.COMPANY_LOGO_URL
  const hasLogo = !!logoUrl && logoUrl.trim() !== '' &&
    !logoUrl.includes('your-domain.com') &&
    !logoUrl.includes('placeholder')

  // App URL for the redirect link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const playbackUrl = `${appUrl.replace(/\/$/, '')}/playback/${answerId}`

  if (planType === 'flame' || planType === 'superflame') {
    // Flame plan: Redirect to the high-quality playback page
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Personal Reading</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; background-color: #f5f5f0; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f0; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e0e0e0;">
          ${hasLogo ? `
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #d4af37;">
              <img src="${logoUrl}" alt="Whispering Palms" style="max-width: 180px; height: auto;" />
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 2px solid #d4af37;">
              <h1 style="margin: 0; color: #333333; font-size: 26px;">Whispering Palms</h1>
            </td>
          </tr>
          `}
          
          <tr>
            <td style="padding: 40px 40px 20px;">
              <p style="margin: 0; color: #333333; font-size: 16px;">${greeting}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 20px 40px;">
              <div style="padding: 20px; background-color: #fafafa; border-left: 4px solid #d4af37; border-radius: 4px;">
                <p style="margin: 0 0 5px; color: #666666; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Your Question</p>
                <p style="margin: 0; color: #333333; font-size: 16px; font-style: italic; line-height: 1.5;">"${question}"</p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-family: 'Georgia', serif;">Meet Your Personal Astrologer</h2>
              <p style="margin: 0 0 35px; color: #555555; font-size: 15px; line-height: 1.6;">
                Your reading is ready to be revealed through a live-narrated experience with your personal guide.
              </p>
              
              <!-- Clickable Avatar -->
              <div style="margin-bottom: 35px;">
                ${(() => {
        const avatarUrl = process.env.ASTROLOGER_AVATAR_URL || 'https://res.cloudinary.com/dnxsyymiq/image/upload/v1768232359/astrologer-avatar_tl7cdm.jpg'
        return `
                  <a href="${playbackUrl}" style="display: inline-block; text-decoration: none;">
                    <img src="${avatarUrl}" alt="View Your Reading" style="width: 150px; height: 150px; border-radius: 75px; border: 3px solid #d4af37; box-shadow: 0 10px 25px rgba(212, 175, 55, 0.4);" />
                  </a>
                  `
      })()}
              </div>
              
              <!-- CTA Button -->
              <div style="margin-bottom: 30px;">
                <a href="${playbackUrl}" style="background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%); color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 6px 20px rgba(184, 134, 11, 0.4); display: inline-block; letter-spacing: 1px;">
                  LAUNCH YOUR READING
                </a>
              </div>
              
              <p style="margin: 0; color: #888888; font-size: 13px; font-style: italic;">
                The button will open your private dashboard for a video & voice experience.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 11px; line-height: 1.5; font-style: italic;">⚠️ Disclaimer: The readings provided are predictions based on your stars and are not 100% accurate. They are meant for guidance purposes only.</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-top: 1px solid #eeeeee; text-align: center;">
              <p style="margin: 0 0 5px; color: #333333; font-size: 16px; font-weight: bold;">Whispering Palms</p>
              <p style="margin: 0; color: #999999; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">A Private Spiritual Experience</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
  } else {
    // Basic and Spark plans: Standard text version
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Reading</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; background-color: #f5f5f0; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f0; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${hasLogo ? `
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center; border-bottom: 2px solid #d4af37;">
              <img src="${logoUrl}" alt="Whispering Palms" style="max-width: 180px; height: auto;" />
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding: 30px 40px 20px; text-align: center; border-bottom: 2px solid #d4af37;">
              <h1 style="margin: 0; color: #333333; font-size: 26px;">Whispering Palms</h1>
            </td>
          </tr>
          `}
          
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #333333; font-size: 16px;">${greeting}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 20px 40px; background-color: #fafafa; border-left: 4px solid #d4af37;">
              <p style="margin: 0 0 5px; color: #666666; font-size: 12px;">YOUR QUESTION</p>
              <p style="margin: 0; color: #333333; font-size: 16px; font-style: italic;">"${question}"</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 40px;">
              <div style="color: #333333; font-size: 16px; line-height: 1.8;">
                ${answer.split('\n').filter(p => p.trim()).map(p => `<p style="margin: 0 0 15px;">${p.trim()}</p>`).join('')}
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 20px 40px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 11px; line-height: 1.5; font-style: italic;">⚠️ Disclaimer: The readings provided are predictions based on your stars and are not 100% accurate. They are meant for guidance purposes only.</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="margin: 0 0 10px; color: #333333; font-size: 16px; font-weight: bold;">Whispering Palms</p>
              <p style="margin: 0; color: #666666; font-size: 13px;">May the stars guide your path</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim()
  }
}

/**
 * Schedule email delivery to Supabase for later delivery
 */
export async function scheduleEmailDelivery(
  userEmail: string,
  emailData: EmailData,
  delayHours: number
): Promise<void> {
  const supabase = await createClient()
  const now = new Date()
  const deliveryTime = new Date(now.getTime() + (delayHours * 60 * 60 * 1000))

  await supabase
    .from('answers')
    .update({
      email_metadata: {
        user_email: userEmail,
        plan_type: emailData.planType,
        delivery_time: deliveryTime.toISOString(),
        audio_url: emailData.audioUrl,
        status: 'pending',
      },
    })
    .eq('id', emailData.answerId)
}

/**
 * Get delivery delay in hours based on plan type
 */
export function getDeliveryDelay(planType: PlanType): number {
  if (process.env.EMAIL_TEST_MODE === 'true') return 0

  switch (planType) {
    case 'basic': return 24
    case 'spark': return 1
    case 'flame':
    case 'superflame': return 5 / 60 // 5 mins
    default: return 24
  }
}
