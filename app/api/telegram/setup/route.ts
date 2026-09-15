/**
 * Telegram Bot Setup API
 * POST /api/telegram/setup
 * 
 * Sets up the webhook for the Telegram bot
 * Only callable by admins
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminToken } from '@/lib/auth/cron'
import { telegramBotService } from '@/lib/services/telegram-bot'

export async function POST(request: NextRequest) {
    try {
        const denied = requireAdminToken(request)
        if (denied) return denied

        const body = await request.json()
        const webhookUrl = body.webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`

        // Set webhook
        const success = await telegramBotService.setWebhook(webhookUrl)

        if (success) {
            return NextResponse.json({
                success: true,
                message: 'Webhook set successfully',
                webhookUrl,
            })
        } else {
            return NextResponse.json({
                success: false,
                error: 'Failed to set webhook',
            }, { status: 500 })
        }
    } catch (error) {
        console.error('[Telegram Setup] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const denied = requireAdminToken(request)
    if (denied) return denied

    try {
        const info = await telegramBotService.getWebhookInfo()
        return NextResponse.json({
            success: true,
            webhookInfo: info,
        })
    } catch (error) {
        console.error('[Telegram Setup] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
