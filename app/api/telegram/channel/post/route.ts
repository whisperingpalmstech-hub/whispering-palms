/**
 * Telegram Channel Post API
 * POST /api/telegram/channel/post
 * 
 * Posts content to the @WhisperingPalmsDaily channel
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminToken } from '@/lib/auth/cron'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '@WhisperingPalmsDaily'

async function sendToChannel(text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown'): Promise<boolean> {
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHANNEL_ID,
                text,
                parse_mode: parseMode,
            }),
        })

        const result = await response.json()
        return result.ok
    } catch (error) {
        console.error('[Telegram Channel] Send error:', error)
        return false
    }
}

// Post daily zodiac horoscopes to channel
export async function POST(request: NextRequest) {
    try {
        const denied = requireAdminToken(request)
        if (denied) return denied

        const body = await request.json()
        const { type, content } = body

        if (type === 'custom' && content) {
            const success = await sendToChannel(content)
            return NextResponse.json({ success, message: success ? 'Posted to channel' : 'Failed to post' })
        }

        if (type === 'daily_horoscope') {
            // Post all zodiac horoscopes to channel
            const supabase = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const today = new Date().toISOString().split('T')[0]
            const zodiacSigns = [
                'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
            ]

            const zodiacEmojis: Record<string, string> = {
                'aries': '♈', 'taurus': '♉', 'gemini': '♊', 'cancer': '♋',
                'leo': '♌', 'virgo': '♍', 'libra': '♎', 'scorpio': '♏',
                'sagittarius': '♐', 'capricorn': '♑', 'aquarius': '♒', 'pisces': '♓'
            }

            let successCount = 0

            for (const sign of zodiacSigns) {
                const { data: horoscope } = await supabase
                    .from('telegram_horoscope_cache')
                    .select('*')
                    .eq('zodiac_sign', sign)
                    .eq('horoscope_date', today)
                    .single()

                if (horoscope) {
                    const emoji = zodiacEmojis[sign]
                    const signName = sign.charAt(0).toUpperCase() + sign.slice(1)

                    const message = `🌞 *Daily Horoscope – ${emoji} ${signName}*

💖 *Love:* ${horoscope.love_prediction}
💼 *Career:* ${horoscope.career_prediction}
💰 *Money:* ${horoscope.money_prediction}
🧘 *Health:* ${horoscope.health_prediction}

✨ Want deeper personal insights?
🔗 https://whispering-palms.org`

                    const success = await sendToChannel(message)
                    if (success) successCount++

                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000))
                }
            }

            return NextResponse.json({
                success: true,
                message: `Posted ${successCount}/${zodiacSigns.length} horoscopes to channel`,
            })
        }

        return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
    } catch (error) {
        console.error('[Telegram Channel] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// Get sample content posts
export async function GET(request: NextRequest) {
    const denied = requireAdminToken(request)
    if (denied) return denied

    const samplePosts = [
        {
            type: 'spiritual_tip',
            content: `🌿 *Love Problems Are Not Always Karma*

Sometimes, they are signs of change.
Your palm reveals what your heart cannot explain.

✨ Upload your palm & ask your question:
https://whispering-palms.org`
        },
        {
            type: 'breakup_guidance',
            content: `💔 *Healing After Heartbreak*

The stars say: This ending is a beginning.
Your palm shows paths you cannot yet see.

🌟 Find clarity in your palm:
https://whispering-palms.org`
        },
        {
            type: 'career_advice',
            content: `💼 *Feeling Stuck in Your Career?*

The planets are shifting. Change is coming.
Your palm reveals your true professional potential.

✨ Unlock your career path:
https://whispering-palms.org`
        },
        {
            type: 'money_wisdom',
            content: `💰 *Money Worries Keeping You Up?*

Financial stress affects your soul energy.
Your palm holds clues to abundance and stability.

🌟 Discover your financial destiny:
https://whispering-palms.org`
        },
    ]

    return NextResponse.json({
        samplePosts,
        usage: 'POST with { type: "custom", content: "..." } or { type: "daily_horoscope" }',
    })
}
