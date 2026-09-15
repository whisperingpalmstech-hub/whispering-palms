'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/app/components/Toast'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import CheckoutModal from '@/app/components/CheckoutModal'
import { useI18n } from '@/app/hooks/useI18n'

interface Plan {
  id: 'basic' | 'spark' | 'flame' | 'superflame'
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: string[]
  questionsPerDay: number | string
  deliveryTime: string
  color: 'basic' | 'spark' | 'flame' | 'superflame'
  popular?: boolean
  icon: React.ReactNode
}

// Plans array - will be created as a function to use translations
const getPlans = (t: (key: string) => string): Plan[] => [
  {
    id: 'basic',
    name: t('plan.free'),
    description: t('plan.freeDesc'),
    priceMonthly: 0,
    priceYearly: 0,
    questionsPerDay: 2,
    deliveryTime: '24 hours',
    color: 'basic',
    features: [
      `2 ${t('plan.questionsPerDay')}`,
      t('plan.writtenAnswers'),
      `${t('plan.emailDelivery')} 24 hours`,
      t('plan.basicInsights'),
      t('plan.questionHistory'),
    ],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  {
    id: 'spark',
    name: t('plan.spark'),
    description: t('plan.sparkDesc'),
    priceMonthly: 9,
    priceYearly: 72,
    questionsPerDay: 6,
    deliveryTime: '1 hour',
    color: 'spark',
    features: [
      `6 ${t('plan.questionsPerDay')}`,
      t('plan.writtenAnswers'),
      `${t('plan.emailDelivery')} 1 hour`,
      t('plan.enhancedInsights'),
      t('plan.prioritySupport'),
      t('plan.questionHistory'),
    ],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'flame',
    name: t('plan.flame'),
    description: t('plan.flameDesc'),
    priceMonthly: 22,
    priceYearly: 176,
    questionsPerDay: 12,
    deliveryTime: '5 minutes',
    color: 'flame',
    popular: true,
    features: [
      `12 ${t('plan.questionsPerDay')}`,
      t('plan.voiceNarrationWithAstrologer'),
      `${t('plan.emailDelivery')} 5 minutes`,
      t('plan.professionalFormatting'),
      t('plan.premiumInsights'),
      t('plan.prioritySupport'),
      t('plan.questionHistory'),
    ],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
  },
  {
    id: 'superflame',
    name: t('plan.superflame'),
    description: t('plan.superflameDesc'),
    priceMonthly: 39,
    priceYearly: 312,
    questionsPerDay: t('common.unlimited'),
    deliveryTime: '5 minutes',
    color: 'superflame',
    features: [
      t('plan.unlimitedQuestions'),
      t('plan.voiceNarrationWithAstrologer'),
      `${t('plan.emailDelivery')} 5 minutes`,
      t('plan.professionalFormatting'),
      t('plan.premiumInsights'),
      t('plan.prioritySupport'),
      t('plan.questionHistory'),
      t('plan.allFlameFeatures'),
    ],
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
]

const colorClasses = {
  basic: {
    bg: 'from-beige-50 via-beige-100 to-beige-50',
    hover: 'hover:from-beige-100 hover:via-beige-200 hover:to-beige-100',
    border: 'border-beige-300 hover:border-beige-500',
    icon: 'text-beige-600',
    button: 'from-beige-500 to-beige-600 hover:from-beige-600 hover:to-beige-700',
    glow: 'from-beige-400 to-beige-600',
    shadow: 'shadow-[0_20px_60px_rgba(200,180,160,0.4)]',
  },
  spark: {
    bg: 'from-peach-50 via-peach-100 to-peach-50',
    hover: 'hover:from-peach-100 hover:via-peach-200 hover:to-peach-100',
    border: 'border-peach-300 hover:border-peach-500',
    icon: 'text-peach-600',
    button: 'from-peach-500 to-peach-600 hover:from-peach-600 hover:to-peach-700',
    glow: 'from-peach-400 to-peach-600',
    shadow: 'shadow-[0_20px_60px_rgba(255,157,122,0.4)]',
  },
  flame: {
    bg: 'from-gold-50 via-gold-100 to-gold-50',
    hover: 'hover:from-gold-100 hover:via-gold-200 hover:to-gold-100',
    border: 'border-gold-300 hover:border-gold-500',
    icon: 'text-gold-600',
    button: 'from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700',
    glow: 'from-gold-400 to-gold-600',
    shadow: 'shadow-[0_20px_60px_rgba(230,194,89,0.4)]',
  },
  superflame: {
    bg: 'from-purple-50 via-purple-100 to-purple-50',
    hover: 'hover:from-purple-100 hover:via-purple-200 hover:to-purple-100',
    border: 'border-purple-300 hover:border-purple-500',
    icon: 'text-purple-600',
    button: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    glow: 'from-purple-400 to-purple-600',
    shadow: 'shadow-[0_20px_60px_rgba(147,51,234,0.4)]',
  },
}

export default function SubscriptionPage() {
  const router = useRouter()
  const { t, language, renderKey } = useI18n() // i18n hook for translations - renderKey forces re-render
  const [mounted, setMounted] = useState(false)
  const [forceRender, setForceRender] = useState(0) // Force re-render counter

  // Get plans with translations
  const plans = getPlans(t)

  // Force re-render when language changes
  useEffect(() => {
    console.log(`[Subscription] 🔄 Language or renderKey changed - language: ${language}, renderKey: ${renderKey}`)
    // This ensures component re-renders when translations are ready
    setForceRender(prev => {
      const newCount = prev + 1
      console.log(`[Subscription] ✅ Updated forceRender to: ${newCount}`)
      return newCount
    })
  }, [language, renderKey])

  // Listen for translation ready events
  useEffect(() => {
    const handleTranslationReady = (event?: any) => {
      console.log(`[Subscription] 🔔 i18n:translationReady event received`, event?.detail)
      // Force re-render when translations are ready
      setForceRender(prev => {
        const newCount = prev + 1
        console.log(`[Subscription] ✅ handleTranslationReady updated forceRender to: ${newCount}`)
        return newCount
      })
    }

    const handleForceUpdate = () => {
      console.log(`[Subscription] 🔔 i18n:forceUpdate event received`)
      setForceRender(prev => {
        const newCount = prev + 1
        console.log(`[Subscription] ✅ handleForceUpdate updated forceRender to: ${newCount}`)
        return newCount
      })
    }

    const handleLanguageChanged = (event?: any) => {
      console.log(`[Subscription] 🔔 i18n:languageChanged event received`, event?.detail)
      setForceRender(prev => {
        const newCount = prev + 1
        console.log(`[Subscription] ✅ handleLanguageChanged updated forceRender to: ${newCount}`)
        return newCount
      })
    }

    if (typeof window !== 'undefined') {
      console.log(`[Subscription] 👂 Registering event listeners`)
      window.addEventListener('i18n:translationReady', handleTranslationReady)
      window.addEventListener('i18n:forceUpdate', handleForceUpdate)
      window.addEventListener('i18n:languageChanged', handleLanguageChanged)

      return () => {
        console.log(`[Subscription] 🧹 Cleaning up event listeners`)
        window.removeEventListener('i18n:translationReady', handleTranslationReady)
        window.removeEventListener('i18n:forceUpdate', handleForceUpdate)
        window.removeEventListener('i18n:languageChanged', handleLanguageChanged)
      }
    }
  }, [])

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<'basic' | 'spark' | 'flame' | 'superflame' | null>(null)
  const [loading, setLoading] = useState(false)
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; amount: number } | null>(null)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    isVisible: boolean
  }>({
    message: '',
    type: 'info',
    isVisible: false,
  })

  useEffect(() => {
    setMounted(true)
    fetchCurrentPlan()
  }, [])

  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch('/api/quota')

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Expected JSON but received:', text.substring(0, 100))
        return
      }

      const result = await response.json()
      if (response.ok && result.data?.plan) {
        setCurrentPlan(result.data.plan)
      }
    } catch (error) {
      console.error('Failed to fetch current plan:', error)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type, isVisible: true })
  }

  const handleSubscribe = async (planId: 'basic' | 'spark' | 'flame' | 'superflame') => {
    // Don't update if already on this plan
    if (currentPlan === planId) {
      showToast(`${t('plan.alreadyOnPlan')} ${planId} ${t('plan.plan')}`, 'info')
      return
    }

    const plan = plans.find(p => p.id === planId)
    if (!plan) return

    // If it's the free basic plan, update directly
    if (planId === 'basic' || plan.priceMonthly === 0) {
      await updatePlanDirectly(planId)
      return
    }

    // For paid plans, open checkout modal
    const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
    setSelectedPlan({ id: planId, amount })
    setCheckoutOpen(true)
  }

  const updatePlanDirectly = async (planId: 'basic' | 'spark' | 'flame' | 'superflame') => {
    setUpdatingPlan(planId)
    setLoading(true)

    try {
      const response = await fetch('/api/subscription/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planType: planId }),
      })

      const result = await response.json()

      if (response.ok) {
        setCurrentPlan(planId)
        showToast(`Successfully changed to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`, 'success')
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('planChanged', { detail: { planType: planId } }))
        // Refresh quota to show updated limits
        setTimeout(() => {
          // Navigate to chat page to see updated quota
          router.push('/chat')
        }, 1500)
      } else {
        showToast(result.error?.message || 'Failed to update plan. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Error updating plan:', error)
      showToast('An error occurred. Please try again.', 'error')
    } finally {
      setLoading(false)
      setUpdatingPlan(null)
    }
  }

  const handleCheckoutSuccess = async () => {
    if (!selectedPlan) return

    // The plan is activated SERVER-side (/api/payments/verify for Razorpay,
    // verify-session/webhook for Stripe) after the provider confirms payment.
    // This handler only reflects that state — it must never write the plan
    // itself, or anyone could grant themselves a paid plan for free.
    // Poll the quota endpoint briefly: webhooks can land a few seconds after
    // the checkout window closes.
    setLoading(true)
    try {
      const planId = selectedPlan.id as 'basic' | 'spark' | 'flame' | 'superflame'
      let confirmed = false
      for (let i = 0; i < 6 && !confirmed; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 2000))
        try {
          const res = await fetch('/api/quota', { cache: 'no-store' })
          const result = await res.json()
          if (res.ok && result.data?.plan === planId) {
            confirmed = true
          }
        } catch {
          // Keep polling; a failed read is not a failed payment.
        }
      }
      setCurrentPlan(planId)
      showToast(
        confirmed
          ? `Success! Your ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan is now active.`
          : 'Payment received! Your plan is activating — it will appear in your quota shortly.',
        'success'
      )
      window.dispatchEvent(new CustomEvent('planChanged', { detail: { planType: planId } }))
      setTimeout(() => {
        router.push('/chat')
      }, 1500)
    } finally {
      setLoading(false)
      setCheckoutOpen(false)
      setSelectedPlan(null)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gold-50 via-ivory-100 to-gold-50 relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto py-6 sm:py-12 px-4 sm:px-6">
        {/* Top Navbar Area */}
        <div className="flex flex-row justify-between items-center mb-8 gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm sm:text-base font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden xs:inline">{t('subscription.backToDashboard')}</span>
            <span className="xs:hidden">Back</span>
          </Link>
          <div className="flex-shrink-0">
            <LanguageSwitcher />
          </div>
        </div>

        {/* Header */}
        <div className={`text-center mb-10 sm:mb-16 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary font-serif mb-3 sm:mb-4">
            {t('subscription.title')}
          </h1>
          {currentPlan && (
            <div className="mb-4 inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-gold-100 to-gold-200 rounded-full border-2 border-gold-400 text-xs sm:text-sm">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gold-800 font-semibold">
                {t('subscription.currentPlan')}: <span className="capitalize">{currentPlan}</span>
              </span>
            </div>
          )}
          <p className="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
            {t('subscription.description')}
          </p>

          {/* Billing Toggle */}
          <div className="flex justify-center mt-4 sm:mt-6 mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-1 sm:gap-2 bg-white/40 backdrop-blur-xl rounded-2xl p-1.5 sm:p-2 border border-white/60 shadow-soft-xl max-w-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative z-10 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold transition-all text-sm sm:text-base ${billingCycle === 'monthly'
                  ? 'bg-gold-500 text-white shadow-soft-lg scale-105'
                  : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                {t('subscription.monthly')}
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`relative z-10 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold transition-all text-sm sm:text-base ${billingCycle === 'yearly'
                  ? 'bg-gold-500 text-white shadow-soft-lg scale-105'
                  : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                <span className="flex items-center gap-2">
                  {t('subscription.yearly')}
                  <span className="inline-flex bg-red-500 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-black animate-pulse uppercase">
                    {t('subscription.savePercent')} 20%
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8 mb-12 sm:mb-20 px-2 sm:px-0">
          {plans.map((plan, index) => {
            const colors = colorClasses[plan.color]
            const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly
            const isHovered = hoveredPlan === plan.id

            return (
              <div
                key={plan.id}
                className={`group relative bg-white/70 backdrop-blur-md rounded-[2.5rem] p-6 sm:p-10 xl:p-6 2xl:p-10 border-2 transition-all duration-500 shadow-soft-2xl hover:shadow-gold-500/10 hover:-translate-y-4 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  } ${plan.popular ? 'border-gold-400 scale-105 z-20 shadow-soft-2xl' : 'border-beige-200 hover:border-gold-200'}`}
                style={{
                  transitionDelay: `${200 + index * 100}ms`,
                  boxShadow: plan.popular ? '0 30px 60px -12px rgba(212, 162, 60, 0.25)' : 'none'
                }}
                onMouseEnter={() => setHoveredPlan(plan.id)}
                onMouseLeave={() => setHoveredPlan(null)}
              >
                {/* Decorative background circle */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.glow} opacity-5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:opacity-10 transition-opacity duration-700`}></div>

                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold-500 via-gold-600 to-gold-500 text-white px-6 py-2 rounded-full text-xs font-black tracking-[0.2em] shadow-soft-lg z-30 uppercase whitespace-nowrap">
                    {t('subscription.mostPopular')}
                  </div>
                )}

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon & Label */}
                  <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className={`p-3 sm:p-4 bg-gradient-to-br ${colors.bg} rounded-3xl ${colors.icon} group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-soft-lg flex-shrink-0`}>
                      <div className="w-6 h-6 sm:w-8 sm:h-8">{plan.icon}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-2xl sm:text-3xl xl:text-xl 2xl:text-3xl font-black text-text-primary font-serif tracking-tight leading-none mb-1 break-words">{plan.name}</h3>
                      <p className="text-text-tertiary text-[10px] font-black uppercase tracking-widest truncate">{plan.id}</p>
                    </div>
                  </div>

                  <p className="text-text-secondary text-sm leading-relaxed mb-8 min-h-[48px] font-medium opacity-80">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-text-primary text-lg font-bold opacity-60">$</span>
                      <span className="text-5xl font-black text-text-primary tracking-tighter">
                        {price}
                      </span>
                      <span className="text-text-secondary text-base font-bold italic opacity-60">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && plan.priceYearly > 0 && (
                      <div className="inline-block mt-3 px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-lg uppercase tracking-wider">
                        Billed annually
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="flex-grow space-y-6 mb-10">
                    <div className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-4">What's included</div>
                    <ul className="space-y-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3 group/item">
                          <div className={`mt-0.5 p-1 rounded-full ${colors.icon} bg-opacity-10 bg-white shadow-sm flex-shrink-0 group-hover/item:scale-125 transition-transform`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-text-primary text-sm font-semibold opacity-90 group-hover/item:opacity-100 transition-opacity">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quota Info Box */}
                  <div className="grid grid-cols-2 gap-3 mb-10">
                    <div className="bg-ivory-50/50 p-3 rounded-2xl border border-beige-100 text-center">
                      <div className="text-[8px] font-black text-text-tertiary uppercase tracking-widest mb-1">Questions</div>
                      <div className="text-lg font-black text-text-primary">{plan.questionsPerDay}</div>
                    </div>
                    <div className="bg-ivory-50/50 p-3 rounded-2xl border border-beige-100 text-center">
                      <div className="text-[8px] font-black text-text-tertiary uppercase tracking-widest mb-1">Delivery</div>
                      <div className="text-lg font-black text-text-primary whitespace-nowrap">{plan.deliveryTime.split(' ')[0]} {plan.deliveryTime.split(' ')[1]?.charAt(0)}</div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-auto relative">
                    {currentPlan === plan.id && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold-200 text-gold-800 text-[9px] font-black rounded-full uppercase tracking-widest z-10 border border-gold-400">
                        Current Status
                      </div>
                    )}
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading || currentPlan === plan.id}
                      className={`w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all shadow-soft-xl hover:shadow-soft-2xl transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${currentPlan === plan.id
                        ? 'bg-beige-100 text-text-tertiary border-2 border-beige-200'
                        : plan.popular
                          ? 'bg-gradient-to-r from-gold-500 via-gold-600 to-gold-500 text-white hover:scale-105 active:scale-95'
                          : 'bg-white border-2 border-beige-200 text-text-primary hover:border-gold-400 hover:text-gold-600'
                        }`}
                    >
                      {loading && updatingPlan === plan.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Processing</span>
                        </div>
                      ) : currentPlan === plan.id ? (
                        'Active Plan'
                      ) : (
                        `Select Plan`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Note */}
        <div className={`text-center text-text-tertiary text-sm transition-all duration-700 delay-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <p>{t('subscription.footerNote1')}</p>
          <p className="mt-2">{t('subscription.footerNote2')}</p>
          <p className="mt-2 text-gold-600 font-semibold">{t('subscription.footerNote3')}</p>
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => {
            setCheckoutOpen(false)
            setSelectedPlan(null)
          }}
          planType={selectedPlan.id as 'basic' | 'spark' | 'flame' | 'superflame'}
          billingPeriod={billingCycle}
          amount={selectedPlan.amount}
          currency="USD"
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </main>
  )
}
