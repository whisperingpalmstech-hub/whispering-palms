/**
 * Telegram Bot Service for Whispering Palms
 * 
 * Handles:
 * - User onboarding (DOB, Time, Place collection)
 * - Daily horoscope delivery
 * - Nurturing message campaigns
 * - Conversion tracking
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Types
export interface TelegramUser {
    id: number
    first_name: string
    last_name?: string
    username?: string
    language_code?: string
}

export interface TelegramMessage {
    message_id: number
    from: TelegramUser
    chat: {
        id: number
        type: string
    }
    text?: string
    date: number
}

export interface TelegramUpdate {
    update_id: number
    message?: TelegramMessage
    callback_query?: {
        id: string
        from: TelegramUser
        message?: TelegramMessage
        data?: string
    }
}

export interface TelegramSubscriber {
    id: string
    telegram_id: number
    telegram_username?: string
    first_name?: string
    last_name?: string
    date_of_birth?: string
    time_of_birth?: string | null
    place_of_birth?: string
    zodiac_sign?: string
    is_active: boolean
    onboarding_step: string
    onboarding_completed: boolean
    signup_date: string
    days_since_signup: number
    last_message_sent_at?: string
    last_nurture_day: number
    converted_to_website: boolean
    preferred_language: string
    timezone: string
    created_at: string
    updated_at: string
}

export interface TelegramHoroscopeCache {
    id: string
    zodiac_sign: string
    horoscope_date: string
    love_prediction: string
    career_prediction: string
    money_prediction: string
    health_prediction: string
    full_horoscope?: string
    created_at: string
}

export interface TelegramNurtureTemplate {
    id: string
    day_number: number
    message_type: string
    message_template: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface TelegramMessageLog {
    id: string
    subscriber_id: string
    telegram_id: number
    message_type: string
    message_content: string
    sent_at: string
    is_successful: boolean
    error_message?: string
}

// Messages Templates
const MESSAGES = {
    // Welcome message
    welcome: (firstName: string) => `🌿 *Welcome ${firstName} to Whispering Palms!*

I am your personal AI Astrologer. I can help you uncover the mysteries of your life through Palmistry and Astrology. ✨

*How can I help you today?*`,

    // Onboarding prompts
    askDob: `📅 To reveal your horoscope, I need your *Date of Birth*.
(Format: DD/MM/YYYY, e.g., 21/08/1998)`,

    askTime: `⏰ Thanks! Now, what is your *Time of Birth*?
(Format: HH:MM AM/PM, e.g., 07:45 AM or write "unknown")`,

    askPlace: `📍 almost there! *Place of Birth?*
(City, Country)`,

    // Confirmation
    confirmation: `✨ *Thank you! Your profile is set.*

🔮 parsing the stars for you... This might take a moment.`,

    // Issues
    loveIssue: `💖 *Love & Relationships* are complex.

To get deep clarity on your relationship, breakup, or future partner, a general horoscope isn't enough.

✋ *Upload your palm* on our website for a personalized AI reading.`,

    moneyIssue: `💰 *Money & Career* stability is crucial.

Curious about your next big opportunity or financial growth? Your palm lines hold the secrets.

✋ *Upload your palm* to discover your financial destiny.`,

    healthIssue: `🧘 *Health & Wellness* is wealth.

Your palm can reveal potential health indicators and vitality levels.

✋ *Secure your well-being* by getting a detailed palm reading.`,

    marriageIssue: `💍 *Marriage & Compatibility*

When will you get married? Will it be happy? Your heart line knows the answer.

✋ *Find out now* by scanning your palm.`,

    breakupIssue: `💔 *Healing from a Breakup*?

Wondering if they will come back or if it's time to move on? Let the lines of destiny guide you.

✋ *Get clarity now* with a palm reading.`,

    introUrl: `https://whispering-palms.org`,

    // Error messages
    invalidDob: `❌ Please enter a valid date in DD/MM/YYYY format.
Example: 21/08/1998`,

    invalidTime: `❌ Please enter a valid time in HH:MM AM/PM format.
Example: 07:45 AM`,

    // Daily horoscope template
    dailyHoroscope: (zodiac: string, love: string, career: string, money: string, health: string) =>
        `🌞 *Daily Horoscope – ${zodiac}*

💖 *Love:* ${love}
💼 *Career:* ${career}
💰 *Money:* ${money}
🧘 *Health:* ${health}

✨ *Need deeper answers?*
Your daily horoscope is just a glimpse. For specific answers about your life path:
👇`,

    // Command responses
    help: `🌿 *Whispering Palms Help*

Commands:
/start - Restart the journey
/horoscope - Get today's prediction
/profile - View your details
/unsubscribe - Stop messages
/help - Show this menu

🔗 [Official Website](https://whispering-palms.org)`,

    profileInfo: (sub: TelegramSubscriber) =>
        `🌿 *Your Profile*

📅 Date of Birth: ${sub.date_of_birth || 'Not set'}
⏰ Time of Birth: ${sub.time_of_birth || 'Not set'}
📍 Place of Birth: ${sub.place_of_birth || 'Not set'}
⭐ Zodiac Sign: ${sub.zodiac_sign ? sub.zodiac_sign.charAt(0).toUpperCase() + sub.zodiac_sign.slice(1) : 'Not set'}

To update your details, use /start`,

    unsubscribed: `🙏 You have been unsubscribed from Whispering Palms.

We're sad to see you go. You can always return by sending /start.

May the stars guide you 🌟`,

    alreadySubscribed: `🌿 You're already receiving daily horoscopes!

Use /horoscope to get today's reading or /help for more options.`,
}

// Zodiac emojis
const ZODIAC_EMOJIS: Record<string, string> = {
    'aries': '♈',
    'taurus': '♉',
    'gemini': '♊',
    'cancer': '♋',
    'leo': '♌',
    'virgo': '♍',
    'libra': '♎',
    'scorpio': '♏',
    'sagittarius': '♐',
    'capricorn': '♑',
    'aquarius': '♒',
    'pisces': '♓',
}

class TelegramBotService {
    private botToken: string
    private supabase: ReturnType<typeof createSupabaseClient>
    private baseUrl = 'https://api.telegram.org/bot'

    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN || ''
        this.supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
    }

    // =====================================================
    // Core API Methods
    // =====================================================

    async sendMessage(chatId: number, text: string, parseMode: 'Markdown' | 'HTML' = 'Markdown', replyMarkup?: object): Promise<boolean> {
        try {
            const payload: Record<string, unknown> = {
                chat_id: chatId,
                text,
                parse_mode: parseMode,
            }

            if (replyMarkup) {
                payload.reply_markup = replyMarkup
            }

            const response = await fetch(`${this.baseUrl}${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const result = await response.json()

            if (!result.ok) {
                console.error('[TelegramBot] Send message failed:', result)
                return false
            }

            return true
        } catch (error) {
            console.error('[TelegramBot] Send message error:', error)
            return false
        }
    }

    async setWebhook(webhookUrl: string): Promise<boolean> {
        try {
            const payload: Record<string, unknown> = {
                url: webhookUrl,
                allowed_updates: ['message', 'callback_query'],
            }

            // Using standard secret token header for security
            // Telegram sends this in X-Telegram-Bot-Api-Secret-Token
            const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET
            if (secretToken) {
                payload.secret_token = secretToken
            }

            const response = await fetch(`${this.baseUrl}${this.botToken}/setWebhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const result = await response.json()
            console.log('[TelegramBot] Webhook set result:', result)
            return result.ok
        } catch (error) {
            console.error('[TelegramBot] Set webhook error:', error)
            return false
        }
    }

    async getWebhookInfo(): Promise<unknown> {
        try {
            const response = await fetch(`${this.baseUrl}${this.botToken}/getWebhookInfo`)
            return await response.json()
        } catch (error) {
            console.error('[TelegramBot] Get webhook info error:', error)
            return null
        }
    }

    // =====================================================
    // Update Handler
    // =====================================================

    async handleUpdate(update: TelegramUpdate): Promise<void> {
        try {
            if (update.message) {
                await this.handleMessage(update.message)
            } else if (update.callback_query) {
                // Handle inline keyboard callbacks
                const callbackData = update.callback_query.data
                const chatId = update.callback_query.message?.chat.id
                if (callbackData && chatId) {
                    // Acknowledge callback immediately to stop progress bar
                    await this.acknowledgeCallback(update.callback_query.id)
                    await this.handleCallback(chatId, update.callback_query.from, callbackData)
                }
            }
        } catch (error) {
            console.error('[TelegramBot] Handle update error:', error)
        }
    }

    async acknowledgeCallback(callbackQueryId: string): Promise<void> {
        try {
            await fetch(`${this.baseUrl}${this.botToken}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: callbackQueryId }),
            })
        } catch (e) {
            console.error('[TelegramBot] Ack callback error', e)
        }
    }

    async handleMessage(message: TelegramMessage): Promise<void> {
        const chatId = message.chat.id
        const text = message.text?.trim() || ''
        const from = message.from

        console.log(`[TelegramBot] Received message: "${text}" from ${from.id}`)

        // Check for commands
        if (text.startsWith('/')) {
            await this.handleCommand(chatId, from, text)
            return
        }

        // Get or create subscriber
        let subscriber = await this.getSubscriber(from.id)

        // If no subscriber and not a command, prompt to start
        if (!subscriber) {
            await this.handleStart(chatId, from)
            return
        }

        // Handle based on onboarding step
        // But if they are just sending random text and onboarding is complete, show menu
        if (subscriber.onboarding_completed) {
            await this.showMainMenu(chatId, from.first_name)
        } else {
            await this.handleOnboardingInput(chatId, subscriber, text)
        }
    }

    async handleCommand(chatId: number, from: TelegramUser, command: string): Promise<void> {
        const cmd = command.split('@')[0].toLowerCase() // Handle @BotName suffix

        switch (cmd) {
            case '/start':
                await this.handleStart(chatId, from)
                break
            case '/help':
                await this.sendMessage(chatId, MESSAGES.help)
                break
            case '/horoscope':
                await this.handleHoroscopeCommand(chatId, from.id)
                break
            case '/profile':
                await this.handleProfileCommand(chatId, from.id)
                break
            case '/unsubscribe':
                await this.handleUnsubscribe(chatId, from.id)
                break
            default:
                await this.sendMessage(chatId, 'Unknown command. Use /help to see available commands.')
        }
    }

    async handleCallback(chatId: number, from: TelegramUser, data: string): Promise<void> {
        // Handle inline button callbacks
        console.log(`[TelegramBot] Handling callback: ${data}`)

        switch (data) {
            case 'get_horoscope':
                await this.handleHoroscopeCommand(chatId, from.id)
                break
            case 'love_issue':
                await this.sendTopicResponse(chatId, MESSAGES.loveIssue)
                break
            case 'money_issue':
                await this.sendTopicResponse(chatId, MESSAGES.moneyIssue)
                break
            case 'health_issue':
                await this.sendTopicResponse(chatId, MESSAGES.healthIssue)
                break
            case 'marriage_issue':
                await this.sendTopicResponse(chatId, MESSAGES.marriageIssue)
                break
            case 'breakup_issue':
                await this.sendTopicResponse(chatId, MESSAGES.breakupIssue)
                break
            case 'visit_website':
                await this.sendMessage(chatId, `🌐 Visit our website for deeper insights:\n${MESSAGES.introUrl}`)
                break
        }
    }

    async sendTopicResponse(chatId: number, message: string): Promise<void> {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✋ Upload Palm on Website', url: MESSAGES.introUrl }
                ],
                [
                    { text: '🔮 Get Free Daily Horoscope', callback_data: 'get_horoscope' }
                ]
            ]
        }
        await this.sendMessage(chatId, message, 'Markdown', keyboard)
    }

    async showMainMenu(chatId: number, firstName: string): Promise<void> {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💖 Love Analysis', callback_data: 'love_issue' },
                    { text: '💰 Money & Career', callback_data: 'money_issue' }
                ],
                [
                    { text: '💍 Marriage', callback_data: 'marriage_issue' },
                    { text: '💔 Breakup Help', callback_data: 'breakup_issue' }
                ],
                [
                    { text: '🧘 Health', callback_data: 'health_issue' }
                ],
                [
                    { text: '🔮 Get Daily Horoscope', callback_data: 'get_horoscope' }
                ],
                [
                    { text: '🌐 Visit Whispering Palms', url: MESSAGES.introUrl }
                ]
            ]
        }

        await this.sendMessage(chatId, `How can I help you today, ${firstName}? \n\nSelect a topic below:`, 'Markdown', keyboard)
    }

    // =====================================================
    // Onboarding Flow
    // =====================================================

    async handleStart(chatId: number, from: TelegramUser): Promise<void> {
        // Always greet 
        // Check if subscriber exists
        let subscriber = await this.getSubscriber(from.id)

        // Create if not exists
        if (!subscriber) {
            subscriber = await this.createSubscriber(from)
        }

        // Show the interactive menu immediately
        // The user wants "immediate reply" and "greet them with their name"
        await this.sendMessage(chatId, MESSAGES.welcome(from.first_name))

        // Show buttons
        await this.showMainMenu(chatId, from.first_name)

        await this.logMessage(subscriber.id, from.id, 'welcome', 'Started bot')
    }

    async handleOnboardingInput(chatId: number, subscriber: TelegramSubscriber, text: string): Promise<void> {
        // If they are in the middle of onboarding, continue
        switch (subscriber.onboarding_step) {
            case 'awaiting_dob':
                await this.handleDobInput(chatId, subscriber, text)
                break
            case 'awaiting_time':
                await this.handleTimeInput(chatId, subscriber, text)
                break
            case 'awaiting_place':
                await this.handlePlaceInput(chatId, subscriber, text)
                break
            default:
                // If text is sent but onboarding is done, show menu
                await this.showMainMenu(chatId, subscriber.first_name || 'Friend')
        }
    }

    async handleDobInput(chatId: number, subscriber: TelegramSubscriber, text: string): Promise<void> {
        // Parse date in DD/MM/YYYY format
        const dateRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/
        const match = text.match(dateRegex)

        if (!match) {
            await this.sendMessage(chatId, MESSAGES.invalidDob)
            return
        }

        const day = parseInt(match[1])
        const month = parseInt(match[2])
        const year = parseInt(match[3])

        // Validate date
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2020) {
            await this.sendMessage(chatId, MESSAGES.invalidDob)
            return
        }

        // Format as YYYY-MM-DD for database
        const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`

        await this.updateSubscriber(subscriber.telegram_id, {
            date_of_birth: formattedDate,
            onboarding_step: 'awaiting_time',
        })

        await this.sendMessage(chatId, `✅ Date of Birth: ${text}\n\n${MESSAGES.askTime}`)
    }

    async handleTimeInput(chatId: number, subscriber: TelegramSubscriber, text: string): Promise<void> {
        // Accept "unknown" or time format
        const lowerText = text.toLowerCase()
        let timeValue: string | null = null

        if (lowerText === 'unknown' || lowerText === 'don\'t know' || lowerText === 'na') {
            timeValue = null
        } else {
            // Parse time in HH:MM AM/PM or 24hr format
            const time12Regex = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i
            const time24Regex = /^(\d{1,2}):(\d{2})$/

            const match12 = text.match(time12Regex)
            const match24 = text.match(time24Regex)

            if (match12) {
                let hour = parseInt(match12[1])
                const minute = parseInt(match12[2])
                const period = match12[3].toLowerCase()

                if (period === 'pm' && hour !== 12) hour += 12
                if (period === 'am' && hour === 12) hour = 0

                timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            } else if (match24) {
                const hour = parseInt(match24[1])
                const minute = parseInt(match24[2])

                if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                    timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
                }
            }

            if (!timeValue && lowerText !== 'unknown') {
                await this.sendMessage(chatId, MESSAGES.invalidTime)
                return
            }
        }

        await this.updateSubscriber(subscriber.telegram_id, {
            time_of_birth: timeValue,
            onboarding_step: 'awaiting_place',
        })

        await this.sendMessage(chatId, `✅ Time of Birth: ${timeValue || 'Unknown'}\n\n${MESSAGES.askPlace}`)
    }

    async handlePlaceInput(chatId: number, subscriber: TelegramSubscriber, text: string): Promise<void> {
        if (text.length < 2) {
            await this.sendMessage(chatId, '❌ Please enter a valid city and country.')
            return
        }

        await this.updateSubscriber(subscriber.telegram_id, {
            place_of_birth: text,
            onboarding_step: 'completed',
            onboarding_completed: true,
        })

        await this.sendMessage(chatId, MESSAGES.confirmation)
        await this.logMessage(subscriber.id, subscriber.telegram_id, 'onboarding_complete', MESSAGES.confirmation)

        // Send first horoscope immediately
        setTimeout(async () => {
            await this.sendDailyHoroscope(subscriber.telegram_id)
        }, 2000)
    }

    // =====================================================
    // Horoscope Delivery
    // =====================================================

    async handleHoroscopeCommand(chatId: number, telegramId: number): Promise<void> {
        const subscriber = await this.getSubscriber(telegramId)

        if (!subscriber) {
            await this.handleStart(chatId, { id: telegramId, first_name: 'Friend' } as TelegramUser)
            return
        }

        if (!subscriber.onboarding_completed || !subscriber.zodiac_sign) {
            // Reset onboarding to ensure smooth flow
            await this.updateSubscriber(telegramId, {
                onboarding_step: 'awaiting_dob',
                onboarding_completed: false,
            })
            await this.sendMessage(chatId, MESSAGES.askDob)
            return
        }

        await this.sendDailyHoroscope(telegramId)
    }

    async sendDailyHoroscope(telegramId: number): Promise<boolean> {
        const subscriber = await this.getSubscriber(telegramId)
        if (!subscriber || !subscriber.zodiac_sign) return false

        // Notify user we are working
        await this.sendMessage(telegramId, '🔮 Consulting the stars for you...')

        const horoscope = await this.getOrGenerateHoroscope(subscriber.zodiac_sign)
        if (!horoscope) {
            await this.sendMessage(telegramId, '🌙 Unable to read the stars right now. Please try again later.')
            return false
        }

        const zodiacName = subscriber.zodiac_sign.charAt(0).toUpperCase() + subscriber.zodiac_sign.slice(1)
        const emoji = ZODIAC_EMOJIS[subscriber.zodiac_sign] || '⭐'

        const message = MESSAGES.dailyHoroscope(
            `${emoji} ${zodiacName}`,
            horoscope.love_prediction,
            horoscope.career_prediction,
            horoscope.money_prediction,
            horoscope.health_prediction
        )

        // Add interactive buttons to the horoscope result
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🌐 Get Full Reading', url: MESSAGES.introUrl }
                ],
                [
                    { text: '💖 Dating Advice', callback_data: 'love_issue' },
                    { text: '💰 Wealth', callback_data: 'money_issue' }
                ]
            ]
        }

        const success = await this.sendMessage(telegramId, message, 'Markdown', keyboard)

        if (success) {
            await this.logMessage(subscriber.id, telegramId, 'daily_horoscope', message)
            await this.updateSubscriber(telegramId, {
                last_message_sent_at: new Date().toISOString(),
            })
        }

        return success
    }

    async getOrGenerateHoroscope(zodiacSign: string): Promise<{
        love_prediction: string
        career_prediction: string
        money_prediction: string
        health_prediction: string
    } | null> {
        const today = new Date().toISOString().split('T')[0]

        // Check cache first
        const { data: cached } = await this.supabase
            .from('telegram_horoscope_cache')
            .select('*')
            .eq('zodiac_sign', zodiacSign)
            .eq('horoscope_date', today)
            .single() as { data: TelegramHoroscopeCache | null }

        if (cached) {
            return cached
        }

        // Generate new horoscope using LLM
        try {
            const { anythingLLMService } = await import('./anythingllm')

            const prompt = `Generate a brief daily horoscope for ${zodiacSign}. Return ONLY a JSON object with these exact keys:
{
  "love": "one sentence about love/relationships today",
  "career": "one sentence about career/work today",
  "money": "one sentence about finances today",
  "health": "one sentence about health/wellness today"
}

Make predictions positive, calming, and spiritually uplifting. Focus on emotional guidance, not predictions.`

            const response = await anythingLLMService.chat(
                process.env.ANYTHINGLLM_WORKSPACE_SLUG || 'whispering-palms',
                prompt,
                'You are a compassionate astrologer. Provide guidance that is calming, spiritual, and focuses on emotional clarity.'
            )

            const jsonMatch = response.response.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('Failed to parse horoscope JSON')
            }

            const horoscopeData = JSON.parse(jsonMatch[0])

            const horoscope = {
                love_prediction: horoscopeData.love || 'Emotional understanding improves today.',
                career_prediction: horoscopeData.career || 'Stay patient with decisions.',
                money_prediction: horoscopeData.money || 'Avoid unnecessary spending.',
                health_prediction: horoscopeData.health || 'Rest and hydration are important.',
            }

            // Cache the horoscope
            await (this.supabase.from('telegram_horoscope_cache') as unknown as { upsert: (data: Partial<TelegramHoroscopeCache>) => Promise<unknown> }).upsert({
                zodiac_sign: zodiacSign,
                horoscope_date: today,
                ...horoscope,
                full_horoscope: JSON.stringify(horoscope),
            })

            return horoscope
        } catch (error) {
            console.error('[TelegramBot] Generate horoscope error:', error)

            // Return default predictions
            return {
                love_prediction: 'Emotional understanding improves today.',
                career_prediction: 'Stay patient with decisions.',
                money_prediction: 'Avoid unnecessary spending.',
                health_prediction: 'Rest and hydration are important.',
            }
        }
    }

    // =====================================================
    // Nurturing Campaign
    // =====================================================

    async sendNurturingMessages(): Promise<{ sent: number; errors: number }> {
        let sent = 0
        let errors = 0

        // Get all active subscribers with their days since signup
        const { data: subscribers } = await this.supabase
            .from('telegram_subscribers')
            .select('*')
            .eq('is_active', true)
            .eq('onboarding_completed', true)
            .eq('converted_to_website', false) as { data: TelegramSubscriber[] | null }

        if (!subscribers || subscribers.length === 0) {
            return { sent, errors }
        }

        // Get nurture templates
        const { data: templates } = await this.supabase
            .from('telegram_nurture_templates')
            .select('*')
            .eq('is_active', true)
            .order('day_number', { ascending: true }) as { data: TelegramNurtureTemplate[] | null }

        if (!templates || templates.length === 0) {
            return { sent, errors }
        }

        for (const subscriber of subscribers) {
            const daysSinceSignup = Math.floor(
                (new Date().getTime() - new Date(subscriber.signup_date).getTime()) / (1000 * 60 * 60 * 24)
            )

            // Find matching template
            const template = templates.find(t =>
                t.day_number === daysSinceSignup &&
                t.day_number > (subscriber.last_nurture_day || 0)
            )

            if (template) {
                const success = await this.sendMessage(subscriber.telegram_id, template.message_template)

                if (success) {
                    sent++
                    await this.updateSubscriber(subscriber.telegram_id, {
                        last_nurture_day: template.day_number,
                        last_message_sent_at: new Date().toISOString(),
                    })
                    await this.logMessage(subscriber.id, subscriber.telegram_id, `nurture_day_${template.day_number}`, template.message_template)
                } else {
                    errors++
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }

        return { sent, errors }
    }

    // =====================================================
    // Daily Broadcast
    // =====================================================

    async sendDailyHoroscopes(): Promise<{ sent: number; errors: number }> {
        let sent = 0
        let errors = 0

        const { data: subscribers } = await this.supabase
            .from('telegram_subscribers')
            .select('*')
            .eq('is_active', true)
            .eq('onboarding_completed', true)
            .not('zodiac_sign', 'is', null) as { data: TelegramSubscriber[] | null }

        if (!subscribers || subscribers.length === 0) {
            return { sent, errors }
        }

        for (const subscriber of subscribers) {
            const success = await this.sendDailyHoroscope(subscriber.telegram_id)

            if (success) {
                sent++
            } else {
                errors++
            }

            // Rate limiting - Telegram allows ~30 messages/second
            await new Promise(resolve => setTimeout(resolve, 50))
        }

        return { sent, errors }
    }

    // =====================================================
    // Profile & Subscription Management
    // =====================================================

    async handleProfileCommand(chatId: number, telegramId: number): Promise<void> {
        const subscriber = await this.getSubscriber(telegramId)

        if (!subscriber) {
            await this.sendMessage(chatId, '🌿 Please send /start to begin your journey first.')
            return
        }

        await this.sendMessage(chatId, MESSAGES.profileInfo(subscriber))
    }

    async handleUnsubscribe(chatId: number, telegramId: number): Promise<void> {
        await this.updateSubscriber(telegramId, { is_active: false })
        await this.sendMessage(chatId, MESSAGES.unsubscribed)
    }

    // =====================================================
    // Database Operations
    // =====================================================

    async getSubscriber(telegramId: number): Promise<TelegramSubscriber | null> {
        const { data } = await this.supabase
            .from('telegram_subscribers')
            .select('*')
            .eq('telegram_id', telegramId)
            .single() as { data: TelegramSubscriber | null }

        return data
    }

    async createSubscriber(user: TelegramUser): Promise<TelegramSubscriber> {
        const insertData = {
            telegram_id: user.id,
            telegram_username: user.username || null,
            first_name: user.first_name,
            last_name: user.last_name || null,
            preferred_language: user.language_code || 'en',
            onboarding_step: 'awaiting_dob',
            signup_date: new Date().toISOString().split('T')[0],
        }

        const { data, error } = await (this.supabase
            .from('telegram_subscribers') as unknown as { insert: (d: typeof insertData) => { select: () => { single: () => Promise<{ data: TelegramSubscriber | null; error: Error | null }> } } })
            .insert(insertData)
            .select()
            .single()

        if (error) {
            console.error('[TelegramBot] Create subscriber error:', error)
            throw error
        }

        return data as TelegramSubscriber
    }

    async updateSubscriber(telegramId: number, updates: Partial<TelegramSubscriber>): Promise<void> {
        const updateData = { ...updates, updated_at: new Date().toISOString() }
        const { error } = await (this.supabase
            .from('telegram_subscribers') as unknown as { update: (d: typeof updateData) => { eq: (col: string, val: number) => Promise<{ error: Error | null }> } })
            .update(updateData)
            .eq('telegram_id', telegramId)

        if (error) {
            console.error('[TelegramBot] Update subscriber error:', error)
        }
    }

    async logMessage(subscriberId: string, telegramId: number, type: string, content: string): Promise<void> {
        const logData = {
            subscriber_id: subscriberId,
            telegram_id: telegramId,
            message_type: type,
            message_content: content,
        }
        await (this.supabase.from('telegram_messages_log') as unknown as { insert: (d: typeof logData) => Promise<unknown> }).insert(logData)
    }

    // =====================================================
    // Analytics
    // =====================================================

    async getStats() {
        const { data: total } = await this.supabase
            .from('telegram_subscribers')
            .select('id', { count: 'exact' })

        const { data: active } = await this.supabase
            .from('telegram_subscribers')
            .select('id', { count: 'exact' })
            .eq('is_active', true)

        const { data: completed } = await this.supabase
            .from('telegram_subscribers')
            .select('id', { count: 'exact' })
            .eq('onboarding_completed', true)

        const { data: converted } = await this.supabase
            .from('telegram_subscribers')
            .select('id', { count: 'exact' })
            .eq('converted_to_website', true)

        // Messages sent today
        const today = new Date().toISOString().split('T')[0]
        const { data: todayMessages } = await this.supabase
            .from('telegram_messages_log')
            .select('id', { count: 'exact' })
            .gte('sent_at', today)

        return {
            totalSubscribers: total?.length || 0,
            activeSubscribers: active?.length || 0,
            completedOnboarding: completed?.length || 0,
            convertedToWebsite: converted?.length || 0,
            messagesSentToday: todayMessages?.length || 0,
        }
    }
}

// Export singleton instance
export const telegramBotService = new TelegramBotService()
