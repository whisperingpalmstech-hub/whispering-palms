'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import WhisperingPalmsLogo from '@/app/components/Logo'
import PalmMatchingStatus from '@/app/components/PalmMatchingStatus'
import DailyHoroscope from '@/app/components/DailyHoroscope'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import { useI18n } from '@/app/hooks/useI18n'

interface User {
  id: string
  email: string
  name?: string
  country?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { t, language, renderKey } = useI18n() // i18n hook for translations - renderKey forces re-render
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [quota, setQuota] = useState<{
    used: number
    remaining: number
    max: number
    resetAt: string
    percentage: number
  } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [animatedQuota, setAnimatedQuota] = useState(0)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [forceRender, setForceRender] = useState(0) // Force re-render counter

  // Force re-render when language changes - CRITICAL for translation updates
  useEffect(() => {
    console.log(`[Dashboard] 🔄 Language or renderKey changed - language: ${language}, renderKey: ${renderKey}`)
    // This effect runs whenever language or renderKey changes
    // This ensures the component re-renders with new translations
    setForceRender(prev => {
      const newCount = prev + 1
      console.log(`[Dashboard] ✅ Updated forceRender to: ${newCount}`)
      return newCount
    })
    setMounted(true)
  }, [language, renderKey])

  // Listen for translation ready events
  useEffect(() => {
    const handleTranslationReady = (event?: any) => {
      console.log(`[Dashboard] 🔔 i18n:translationReady event received`, event?.detail)
      // Force re-render when translations are ready
      setForceRender(prev => {
        const newCount = prev + 1
        console.log(`[Dashboard] ✅ handleTranslationReady updated forceRender to: ${newCount}`)
        return newCount
      })
      setMounted(prev => !prev)
    }

    const handleForceUpdate = () => {
      console.log(`[Dashboard] 🔔 i18n:forceUpdate event received`)
      setForceRender(prev => {
        const newCount = prev + 1
        console.log(`[Dashboard] ✅ handleForceUpdate updated forceRender to: ${newCount}`)
        return newCount
      })
    }

    const handleLanguageChanged = (event?: any) => {
      console.log(`[Dashboard] 🔔 i18n:languageChanged event received`, event?.detail)
      setForceRender(prev => {
        const newCount = prev + 1
        console.log(`[Dashboard] ✅ handleLanguageChanged updated forceRender to: ${newCount}`)
        return newCount
      })
    }

    if (typeof window !== 'undefined') {
      console.log(`[Dashboard] 👂 Registering event listeners`)
      window.addEventListener('i18n:translationReady', handleTranslationReady)
      window.addEventListener('i18n:forceUpdate', handleForceUpdate)
      window.addEventListener('i18n:languageChanged', handleLanguageChanged)

      return () => {
        console.log(`[Dashboard] 🧹 Cleaning up event listeners`)
        window.removeEventListener('i18n:translationReady', handleTranslationReady)
        window.removeEventListener('i18n:forceUpdate', handleForceUpdate)
        window.removeEventListener('i18n:languageChanged', handleLanguageChanged)
      }
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    checkAuth()
    fetchQuota()

    // Check for Stripe Checkout Session fallback
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const status = params.get('status')

    if (sessionId && status === 'success') {
      verifyStripeSession(sessionId)
    }
  }, [])

  const verifyStripeSession = async (sessionId: string) => {
    try {
      setLoading(true)
      console.log('[Dashboard] Verifying payment session:', sessionId)
      const response = await fetch(`/api/payments/verify-session?session_id=${sessionId}`)
      const result = await response.json()

      if (response.ok && result.success) {
        console.log('[Dashboard] Payment verified! Plan updated to:', result.plan)
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard')
        // Refresh data
        await fetchQuota()
        await checkAuth()
      }
    } catch (error) {
      console.error('[Dashboard] Session verification failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (quota) {
      // Animate quota number
      const target = quota.remaining
      const duration = 1000
      const steps = 30
      const increment = target / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          setAnimatedQuota(target)
          clearInterval(timer)
        } else {
          setAnimatedQuota(Math.floor(current))
        }
      }, duration / steps)
      return () => clearInterval(timer)
    }
  }, [quota])

  const fetchQuota = async () => {
    try {
      const response = await fetch('/api/quota')

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.warn('[Dashboard] API returned HTML instead of JSON:', text.substring(0, 100))
        return
      }

      const result = await response.json()
      if (response.ok && result.data?.quota) {
        setQuota(result.data.quota)
      }
    } catch (error) {
      console.error('Failed to fetch quota:', error)
    }
  }


  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const result = await response.json()

      if (!response.ok) {
        router.push('/login')
        return
      }

      setUser(result.data.user)

      const profileResponse = await fetch('/api/user/profile')
      const profileResult = await profileResponse.json()

      if (!profileResponse.ok || !profileResult.data?.profile) {
        router.push('/onboarding')
        return
      }

      const palmResponse = await fetch('/api/user/profile/palm-images')
      const palmResult = await palmResponse.json()

      if (!palmResponse.ok || !palmResult.data?.palmImages || palmResult.data.palmImages.length === 0) {
        router.push('/onboarding/palm-upload')
        return
      }

      // Calculate profile completion percentage
      const profile = profileResult.data?.profile
      const palmImages = palmResult.data?.palmImages || []
      let completedFields = 0
      const totalFields = 7 // name, country, date_of_birth, time_of_birth, place_of_birth, birth_timezone, palm images

      if (user?.name) completedFields++
      if (user?.country) completedFields++
      if (profile?.date_of_birth) completedFields++
      if (profile?.time_of_birth) completedFields++
      if (profile?.place_of_birth) completedFields++
      if (profile?.birth_timezone) completedFields++
      if (palmImages.length > 0) completedFields++

      setProfileCompletion(Math.round((completedFields / totalFields) * 100))
    } catch (error) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gold-50 via-ivory-100 to-gold-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold-400/30 border-t-gold-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-primary text-xl font-semibold">{t('dashboard.consultingStars')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gold-50 via-ivory-100 to-gold-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto py-4 sm:py-6">
        {/* Header */}
        <div className={`bg-gradient-to-br from-gold-50/90 via-ivory-100/90 to-gold-50/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-soft-xl border border-gold-200/50 mb-4 sm:mb-6 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <Link href="/" className="hover:opacity-80 transition-opacity flex-shrink-0">
                <WhisperingPalmsLogo className="w-10 h-10 sm:w-12 sm:h-12" />
              </Link>
              <div key={`welcome-${language}-${renderKey}`} className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-1 truncate">{t('dashboard.title')}</h1>
                <p className="text-text-secondary text-xs sm:text-sm md:text-base break-words">{t('common.welcome')}, <span className="text-gold-600 font-semibold">{user?.name || user?.email}</span>!</p>
                {profileCompletion > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 bg-beige-200 rounded-full h-2 overflow-hidden max-w-[200px]">
                      <div
                        className="bg-gradient-to-r from-gold-500 to-gold-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${profileCompletion}%` }}
                      />
                    </div>
                    <span className="text-text-secondary text-xs font-medium">{profileCompletion}% {t('common.complete')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <LanguageSwitcher />
              <Link
                href="/settings"
                className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-white border-2 border-beige-300 hover:border-gold-400 text-text-primary rounded-lg sm:rounded-xl font-semibold transition-all shadow-soft hover:shadow-soft-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">{t('common.settings')}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-soft hover:shadow-soft-lg flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br from-gold-50/90 via-ivory-100/90 to-gold-50/90 backdrop-blur-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-soft-xl border border-gold-200/50 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Action Cards - 2 per row layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
            <Link
              href="/settings"
              className={`group relative block p-6 sm:p-8 min-h-[160px] sm:min-h-[180px] bg-gradient-to-br from-peach-50 via-peach-100 to-peach-50 hover:from-peach-100 hover:via-peach-200 hover:to-peach-100 rounded-2xl sm:rounded-3xl border-2 border-peach-300 hover:border-peach-500 transition-all duration-700 shadow-soft-xl hover:shadow-[0_20px_60px_rgba(255,157,122,0.4)] hover:-translate-y-2 hover:scale-[1.01] overflow-hidden ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '200ms' }}
            >
              {/* Glow effect on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-peach-400 to-peach-600 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-700"></div>

              {/* Shimmer overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-peach-500 to-peach-600 rounded-xl sm:rounded-2xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 shadow-soft-xl animate-pulse-soft group-hover:shadow-[0_10px_40px_rgba(255,157,122,0.6)] flex-shrink-0">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 sm:mb-2 group-hover:text-peach-700 transition-colors duration-300">{t('dashboard.completeProfile')}</h3>
                    <p className="text-text-secondary text-sm sm:text-base leading-relaxed">{t('dashboard.completeProfileDesc')}</p>
                  </div>
                </div>
                <div className="flex items-center text-peach-600 text-sm sm:text-base font-bold group-hover:text-peach-700 transition-colors duration-300 self-end sm:self-auto">
                  <span className="hidden sm:inline">{t('common.getStarted')}</span>
                  <span className="sm:hidden">Start</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 sm:ml-3 group-hover:translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/onboarding/palm-upload"
              className={`group relative block p-6 sm:p-8 min-h-[160px] sm:min-h-[180px] bg-gradient-to-br from-sage-50 via-sage-100 to-sage-50 hover:from-sage-100 hover:via-sage-200 hover:to-sage-100 rounded-2xl sm:rounded-3xl border-2 border-sage-300 hover:border-sage-500 transition-all duration-700 shadow-soft-xl hover:shadow-[0_20px_60px_rgba(143,165,122,0.4)] hover:-translate-y-2 hover:scale-[1.01] overflow-hidden ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '300ms' }}
            >
              {/* Glow effect on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-sage-400 to-sage-600 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-700"></div>

              {/* Shimmer overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-sage-500 to-sage-600 rounded-xl sm:rounded-2xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 shadow-soft-xl animate-pulse-soft group-hover:shadow-[0_10px_40px_rgba(143,165,122,0.6)] flex-shrink-0">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 sm:mb-2 group-hover:text-sage-700 transition-colors duration-300">{t('dashboard.uploadPalms')}</h3>
                    <p className="text-text-secondary text-sm sm:text-base leading-relaxed">{t('dashboard.uploadPalmsDesc')}</p>
                  </div>
                </div>
                <div className="flex items-center text-sage-600 text-sm sm:text-base font-bold group-hover:text-sage-700 transition-colors duration-300 self-end sm:self-auto">
                  <span className="hidden sm:inline">{t('common.uploadNow')}</span>
                  <span className="sm:hidden">Upload</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 sm:ml-3 group-hover:translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/chat"
              className={`group relative block p-6 sm:p-8 min-h-[160px] sm:min-h-[180px] bg-gradient-to-br from-gold-50 via-gold-100 to-gold-50 hover:from-gold-100 hover:via-gold-200 hover:to-gold-100 rounded-2xl sm:rounded-3xl border-2 border-gold-300 hover:border-gold-500 transition-all duration-700 shadow-soft-xl hover:shadow-[0_20px_60px_rgba(230,194,89,0.4)] hover:-translate-y-2 hover:scale-[1.01] overflow-hidden ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '400ms' }}
            >
              {/* Glow effect on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-gold-400 to-gold-600 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-700"></div>

              {/* Shimmer overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl sm:rounded-2xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 shadow-soft-xl animate-pulse-soft group-hover:shadow-[0_10px_40px_rgba(230,194,89,0.6)] flex-shrink-0">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 sm:mb-2 group-hover:text-gold-700 transition-colors duration-300">{t('dashboard.askQuestions')}</h3>
                    <p className="text-text-secondary text-sm sm:text-base leading-relaxed">{t('dashboard.askQuestionsDesc')}</p>
                  </div>
                </div>
                <div className="flex items-center text-gold-600 text-sm sm:text-base font-bold group-hover:text-gold-700 transition-colors duration-300 self-end sm:self-auto">
                  <span className="hidden sm:inline">{t('common.askNow')}</span>
                  <span className="sm:hidden">Ask</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 sm:ml-3 group-hover:translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>

            <Link
              href="/subscription"
              className={`group relative block p-6 sm:p-8 min-h-[160px] sm:min-h-[180px] bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50 hover:from-purple-100 hover:via-purple-200 hover:to-purple-100 rounded-2xl sm:rounded-3xl border-2 border-purple-300 hover:border-purple-500 transition-all duration-700 shadow-soft-xl hover:shadow-[0_20px_60px_rgba(147,51,234,0.4)] hover:-translate-y-2 hover:scale-[1.01] overflow-hidden ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '500ms' }}
            >
              {/* Glow effect on hover */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-700"></div>

              {/* Shimmer overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl sm:rounded-2xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-700 shadow-soft-xl animate-pulse-soft group-hover:shadow-[0_10px_40px_rgba(147,51,234,0.6)] flex-shrink-0">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 sm:mb-2 group-hover:text-purple-700 transition-colors duration-300">{t('dashboard.subscriptionPlans')}</h3>
                    <p className="text-text-secondary text-sm sm:text-base leading-relaxed">{t('common.upgradeFeatures')}</p>
                  </div>
                </div>
                <div className="flex items-center text-purple-600 text-sm sm:text-base font-bold group-hover:text-purple-700 transition-colors duration-300 self-end sm:self-auto">
                  <span className="hidden sm:inline">{t('dashboard.viewPlans')}</span>
                  <span className="sm:hidden">Plans</span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 ml-2 sm:ml-3 group-hover:translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* Daily Quota and Palm Matching - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
            {/* Daily Quota Card */}
            {quota && (
              <div className={`group relative min-h-[160px] sm:min-h-[180px] bg-gradient-to-br from-gold-100 via-peach-100 to-gold-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-gold-300 hover:border-gold-500 shadow-soft-xl hover:shadow-[0_25px_70px_rgba(230,194,89,0.3)] transition-all duration-700 delay-500 hover:-translate-y-2 hover:scale-[1.02] overflow-hidden ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-gold-400 to-peach-400 rounded-3xl opacity-0 group-hover:opacity-15 blur-2xl transition-opacity duration-700"></div>

                <div className="relative z-10 flex flex-col">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-4">
                    <div className="flex items-center gap-3 sm:gap-5">
                      <div className="p-3 sm:p-4 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl sm:rounded-2xl shadow-soft-xl animate-pulse-soft group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 group-hover:shadow-[0_15px_50px_rgba(230,194,89,0.5)] flex-shrink-0">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-1">{t('common.dailyQuota')}</h3>
                        <p className="text-text-secondary text-xs sm:text-sm">{t('common.resetsAt')} {new Date(quota.resetAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto">
                      {quota.max === -1 ? (
                        <>
                          <div className="text-3xl sm:text-4xl font-bold text-purple-600 transition-all duration-500">
                            <span className="inline-block animate-scale-in">∞</span>
                          </div>
                          <div className="text-text-secondary text-xs sm:text-sm font-medium mt-1">{t('common.unlimited')}</div>
                        </>
                      ) : (
                        <>
                          <div className={`text-3xl sm:text-4xl font-bold transition-all duration-500 ${quota.remaining === 0
                            ? 'text-red-600'
                            : quota.remaining <= 1
                              ? 'text-yellow-600'
                              : 'text-green-700'
                            }`}>
                            <span className="inline-block animate-scale-in">{animatedQuota}</span>
                          </div>
                          <div className="text-text-secondary text-xs sm:text-sm font-medium mt-1">{t('common.remaining')}</div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {quota.max === -1 ? (
                      <div className="text-center py-2">
                        <p className="text-purple-600 font-bold text-base">{t('common.superFlamePlan')}</p>
                        <p className="text-text-secondary text-xs mt-1">{t('common.unlimitedQuestionsPerDay')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-sm text-text-secondary font-medium">
                          <span>{t('common.used')}: {quota.used} / {quota.max}</span>
                          <span className="font-bold text-text-primary">{quota.percentage}%</span>
                        </div>
                        <div className="w-full bg-beige-300 rounded-full h-3 overflow-hidden shadow-inner">
                          <div
                            className={`h-3 rounded-full transition-all duration-1000 ease-out ${quota.percentage >= 100
                              ? 'bg-red-600'
                              : quota.percentage >= 80
                                ? 'bg-yellow-600'
                                : 'bg-green-600'
                              }`}
                            style={{
                              width: `${Math.min(quota.percentage, 100)}%`,
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Palm Matching Card */}
            <div className={`min-h-[180px] transition-all duration-700 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <PalmMatchingStatus />
            </div>
          </div>

          {/* Daily Horoscope Section - Full Width */}
          <div className={`mt-6 sm:mt-8 transition-all duration-700 delay-[800ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <DailyHoroscope />
          </div>
        </div>
      </div>
    </main>
  )
}
