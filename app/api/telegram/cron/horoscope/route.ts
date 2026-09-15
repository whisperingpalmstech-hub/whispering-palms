/**
 * Telegram Daily Horoscope Cron Job
 * POST /api/telegram/cron/horoscope
 * 
 * Called by external cron service (e.g., Vercel Cron, cron-job.org)
 * to send daily horoscopes to all subscribers
 * 
 * Recommended schedule: 9:00 AM IST daily
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCronAuth } from '@/lib/auth/cron'
import { telegramBotService } from '@/lib/services/telegram-bot'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max for all messages

export async function POST(request: NextRequest) {
    try {
        // Was falling back to a hardcoded 'whispering-palms-cron' string, which
        // is in the source and therefore public. requireCronAuth has no default.
        const denied = requireCronAuth(request)
        if (denied) return denied

        console.log('[Telegram Cron] Starting daily horoscope broadcast...')

        const result = await telegramBotService.sendDailyHoroscopes()

        console.log(`[Telegram Cron] Daily horoscopes sent: ${result.sent} success, ${result.errors} errors`)

        return NextResponse.json({
            success: true,
            message: 'Daily horoscopes sent',
            sent: result.sent,
            errors: result.errors,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[Telegram Cron] Error:', error)
        return NextResponse.json({
            success: false,
            error: 'Failed to send daily horoscopes'
        }, { status: 500 })
    }
}

// GET handler removed: it was an unauthenticated status banner.
// Use /api/health for liveness.
