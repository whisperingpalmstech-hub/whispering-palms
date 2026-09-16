/**
 * Telegram Bot Webhook Handler
 * POST /api/telegram/webhook
 * 
 * This endpoint receives updates from Telegram Bot API
 * Webhook URL: https://whispering-palms.org/api/telegram/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminToken } from '@/lib/auth/cron'
import { telegramBotService } from '@/lib/services/telegram-bot'

// Verify webhook secret (optional but recommended)
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
    try {
        // Verify the secret token Telegram sends with every update.
        //
        // This used to be `if (WEBHOOK_SECRET && ...)`, so an unset
        // TELEGRAM_WEBHOOK_SECRET skipped the check entirely and let anyone POST
        // fabricated updates to drive the bot. It now fails closed in production.
        const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token')

        if (!WEBHOOK_SECRET) {
            if (process.env.NODE_ENV === 'production') {
                console.error('[Telegram Webhook] TELEGRAM_WEBHOOK_SECRET is not set. Rejecting.')
                return NextResponse.json({ ok: false }, { status: 503 })
            }
            console.warn('[Telegram Webhook] No secret configured - accepting in development only.')
        } else if (secretHeader !== WEBHOOK_SECRET) {
            console.error('[Telegram Webhook] Invalid secret token')
            return NextResponse.json({ ok: false }, { status: 401 })
        }

        const update = await request.json()
        // Only the update id is logged: the payload carries subscribers' message
        // text and profile details.
        console.log('[Telegram Webhook] Received update', update?.update_id ?? '(no id)')

        // Process update
        try {
            await telegramBotService.handleUpdate(update)
        } catch (error) {
            console.error('[Telegram Webhook] Handler error:', error)
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[Telegram Webhook] Error:', error)
        return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 })
    }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
    // getWebhookInfo() returns the bot's webhook URL and configuration, which
    // was previously readable by anyone. Admin token required.
    const denied = requireAdminToken(request)
    if (denied) return denied

    const info = await telegramBotService.getWebhookInfo()
    return NextResponse.json({
        message: 'Telegram Bot Webhook Endpoint',
        webhookInfo: info,
    })
}
