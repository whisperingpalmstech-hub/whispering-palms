/**
 * Telegram Bot Statistics API
 * GET /api/telegram/stats
 * 
 * Returns analytics and statistics for the Telegram bot
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminToken } from '@/lib/auth/cron'
import { telegramBotService } from '@/lib/services/telegram-bot'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
    try {
        const denied = requireAdminToken(request)
        if (denied) return denied

        const stats = await telegramBotService.getStats()

        // Get additional detailed stats
        const supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Get subscribers by zodiac sign
        const { data: byZodiac } = await supabase
            .from('telegram_subscribers')
            .select('zodiac_sign')
            .eq('is_active', true)
            .not('zodiac_sign', 'is', null)

        const zodiacCounts: Record<string, number> = {}
        byZodiac?.forEach(s => {
            const sign = s.zodiac_sign?.toLowerCase() || 'unknown'
            zodiacCounts[sign] = (zodiacCounts[sign] || 0) + 1
        })

        // Get recent signups (last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data: recentSignups } = await supabase
            .from('telegram_subscribers')
            .select('signup_date')
            .gte('signup_date', sevenDaysAgo.toISOString().split('T')[0])
            .order('signup_date', { ascending: false })

        // Get message statistics
        const { data: messageStats } = await supabase
            .from('telegram_messages_log')
            .select('message_type')

        const messageCounts: Record<string, number> = {}
        messageStats?.forEach(m => {
            messageCounts[m.message_type] = (messageCounts[m.message_type] || 0) + 1
        })

        return NextResponse.json({
            success: true,
            stats: {
                ...stats,
                subscribersByZodiac: zodiacCounts,
                recentSignupsCount: recentSignups?.length || 0,
                messagesByType: messageCounts,
            },
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[Telegram Stats] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
