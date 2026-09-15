/**
 * Telegram Nurturing Campaign Cron Job
 * POST /api/telegram/cron/nurture
 * 
 * Called by external cron service to send nurturing messages
 * based on days since signup
 * 
 * Recommended schedule: 2:00 PM IST daily
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth/cron'
import { telegramBotService } from '@/lib/services/telegram-bot'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max

export async function POST(request: NextRequest) {
    try {
        // Was falling back to a hardcoded 'whispering-palms-cron' string, which
        // is in the source and therefore public. requireCronAuth has no default.
        const denied = requireCronAuth(request)
        if (denied) return denied

        console.log('[Telegram Nurture Cron] Starting nurturing campaign...')

        const result = await telegramBotService.sendNurturingMessages()

        console.log(`[Telegram Nurture Cron] Nurturing messages sent: ${result.sent} success, ${result.errors} errors`)

        return NextResponse.json({
            success: true,
            message: 'Nurturing messages sent',
            sent: result.sent,
            errors: result.errors,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[Telegram Nurture Cron] Error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to send nurturing messages'
        }, { status: 500 })
    }
}

// GET handler removed: it was an unauthenticated status banner.
// Use /api/health for liveness.
