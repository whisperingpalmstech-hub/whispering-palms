'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LanguageSwitcher from '@/app/components/LanguageSwitcher'
import WhisperingPalmsLogo from '@/app/components/Logo'
import GlobalFooter from '@/app/components/GlobalFooter'
import { useI18n } from '@/app/hooks/useI18n'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const { t, renderKey } = useI18n() // i18n hook for translations

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-soft">
      {/* Enhanced decorative elements with stronger colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-peach-400/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-gold-400/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sage-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-soft"></div>
      </div>

      {/* Top Navigation Bar - Sticky */}
      <nav className="sticky top-0 z-50 w-full bg-gradient-to-br from-gold-50/95 via-ivory-100/95 to-gold-50/95 backdrop-blur-lg border-b border-gold-200/30 shadow-soft">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1.5 sm:gap-3 hover:opacity-80 transition-opacity duration-300 flex-shrink-0">
              <WhisperingPalmsLogo className="w-8 h-8 sm:w-10 sm:h-10" variant="simple" />
              <span className="text-base sm:text-xl md:text-2xl font-bold text-text-primary whitespace-nowrap hidden xs:inline">{t('dashboard.title')}</span>
            </Link>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1 sm:gap-3">
              <LanguageSwitcher />
              <Link
                href="/login"
                className="px-2.5 sm:px-4 md:px-5 py-1.5 sm:py-2.5 bg-white/90 backdrop-blur-sm border-2 border-gold-400/50 text-text-primary rounded-lg sm:rounded-xl font-semibold text-[10px] sm:text-sm md:text-base tracking-wide transition-all duration-300 hover:bg-white hover:border-gold-500 hover:shadow-soft hover:scale-105 whitespace-nowrap"
              >
                {t('auth.signInLink')}
              </Link>
              <Link
                href="/quiz"
                className="group relative px-3 sm:px-5 md:px-6 py-1.5 sm:py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-lg sm:rounded-xl font-semibold text-[10px] sm:text-sm md:text-base tracking-wide transition-all duration-300 hover:scale-110 hover:shadow-soft-lg overflow-hidden whitespace-nowrap"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gold-400 to-gold-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                </div>
                <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
                  <span className="hidden sm:inline">{t('common.getStarted')}</span>
                  <span className="sm:hidden">Start</span>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center max-w-5xl mx-auto">
          {/* Logo/Title with enhanced animations */}
          <div className={`mb-8 sm:mb-12 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
            <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-8xl xl:text-9xl font-bold mb-3 sm:mb-4 text-text-primary tracking-tight transition-all duration-1000 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              {t('dashboard.title')}
            </h1>
            <div className={`h-1 w-24 sm:w-32 bg-gradient-to-r from-transparent via-gold-500 to-transparent mx-auto rounded-full transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}></div>
            <p className={`text-lg sm:text-xl md:text-2xl lg:text-3xl text-gold-600 italic mt-4 sm:mt-6 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {t('home.astro')}
            </p>
          </div>

          {/* Tagline with staggered animations */}
          <p className={`text-base sm:text-lg md:text-xl lg:text-2xl text-text-secondary mb-3 sm:mb-4 font-light leading-relaxed px-2 transition-all duration-700 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {t('home.tagline')}
          </p>
          <p className={`text-sm sm:text-base md:text-lg text-text-tertiary mb-12 sm:mb-16 max-w-2xl mx-auto leading-relaxed px-2 transition-all duration-700 delay-900 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {t('home.description')}
          </p>

          {/* Features with enhanced animations and stronger colors */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16 px-2 sm:px-0 transition-all duration-700 delay-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {[
              {
                icon: (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: t('home.astrologyInsights'),
                desc: t('home.astrologyInsightsDesc'),
                color: "peach"
              },
              {
                icon: (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                  </svg>
                ),
                title: t('home.palmReading'),
                desc: t('home.palmReadingDesc'),
                color: "sage"
              },
              {
                icon: (
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                ),
                title: t('home.expertGuidance'),
                desc: t('home.expertGuidanceDesc'),
                color: "gold"
              }
            ].map((feature, idx) => {
              const colorClasses = {
                peach: {
                  bg: 'from-peach-50 to-peach-100',
                  hover: 'hover:from-peach-100 hover:to-peach-200',
                  border: 'border-peach-300 hover:border-peach-400',
                  icon: 'text-peach-600',
                  title: 'group-hover:text-peach-600'
                },
                sage: {
                  bg: 'from-sage-50 to-sage-100',
                  hover: 'hover:from-sage-100 hover:to-sage-200',
                  border: 'border-sage-300 hover:border-sage-400',
                  icon: 'text-sage-600',
                  title: 'group-hover:text-sage-600'
                },
                gold: {
                  bg: 'from-gold-50 to-gold-100',
                  hover: 'hover:from-gold-100 hover:to-gold-200',
                  border: 'border-gold-300 hover:border-gold-400',
                  icon: 'text-gold-600',
                  title: 'group-hover:text-gold-600'
                }
              }
              const colors = colorClasses[feature.color as keyof typeof colorClasses]

              return (
                <div
                  key={idx}
                  className={`group relative bg-gradient-to-br ${colors.bg} ${colors.hover} rounded-xl sm:rounded-2xl p-6 sm:p-8 border-2 ${colors.border} transition-all duration-500 hover:shadow-soft-lg hover:-translate-y-2 hover:scale-105 overflow-hidden ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${1100 + idx * 100}ms` }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  </div>
                  <div className="relative">
                    <div className={`${colors.icon} mb-3 sm:mb-4 group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 flex justify-center animate-pulse-soft`}>
                      <div className="w-10 h-10 sm:w-12 sm:h-12">{feature.icon}</div>
                    </div>
                    <h3 className={`text-lg sm:text-xl font-semibold text-text-primary mb-2 sm:mb-3 ${colors.title} transition-colors duration-300`}>{feature.title}</h3>
                    <p className="text-text-secondary text-xs sm:text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA Buttons with enhanced animations */}
          <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-20 px-2 transition-all duration-700 delay-1300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link
              href="/quiz"
              className="group relative w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg tracking-wide transition-all duration-500 hover:scale-110 hover:shadow-soft-xl sm:min-w-[200px] text-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gold-400 to-gold-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              </div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                🔮 {t('common.getStarted')}
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>

            <Link
              href="/login"
              className="group relative w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-white/90 backdrop-blur-sm border-2 border-gold-400/50 text-text-primary rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg tracking-wide transition-all duration-500 hover:bg-white hover:border-gold-500 hover:shadow-soft-lg hover:scale-105 sm:min-w-[200px] text-center"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t('auth.signInLink')}
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </span>
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div className={`max-w-3xl mx-auto mb-12 sm:mb-16 px-4 transition-all duration-700 delay-[1500ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-gold-50/80 backdrop-blur-sm border border-gold-300/50 rounded-xl p-4 sm:p-5 text-center">
            <p className="text-text-tertiary text-[11px] sm:text-xs leading-relaxed">
              <span className="font-semibold text-gold-600">⚠️ Disclaimer:</span>{' '}
              The readings provided are predictions based on your stars and are <span className="font-semibold">not 100% accurate</span>. They are meant for guidance purposes only.
            </p>
          </div>
        </div>

        <GlobalFooter />
      </div>
    </main>
  )
}
