'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/app/contexts/TranslationContext'
import { getDictionaryLanguages, isSupportedLanguage } from '@/lib/i18n/registry'

/**
 * The offered languages come from lib/i18n/registry.ts - the single source of
 * truth. This component previously kept its own list, which is how it drifted
 * out of sync with the dictionaries, the settings dropdown and the TTS map.
 */
function getSupportedLanguageList() {
  return getDictionaryLanguages()
}

export default function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const supportedLanguages = getSupportedLanguageList()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLanguageChange = (langCode: string) => {
    if (langCode === language) {
      setIsOpen(false)
      return
    }

    // Validate language is supported
    if (!isSupportedLanguage(langCode)) {
      console.warn(`[LanguageSwitcher] Language ${langCode} is not supported, falling back to English`)
      langCode = 'en'
    }

    console.log(`[LanguageSwitcher] 🔄 Changing language to: ${langCode}`)

    // Close dropdown
    setIsOpen(false)

    // Update language - this triggers ONLY a state update, NO API calls
    setLanguage(langCode)

    console.log(`[LanguageSwitcher] ✅ Language changed to: ${langCode}`)
  }

  const currentLanguage = supportedLanguages.find(lang => lang.code === language) || supportedLanguages[0]

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonRect(rect)
    }
  }, [isOpen])

  if (!mounted) return null

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => {
            if (buttonRef.current) {
              const rect = buttonRef.current.getBoundingClientRect()
              setButtonRect(rect)
            }
            setIsOpen(!isOpen)
          }}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white/90 backdrop-blur-sm border-2 border-gold-400/50 text-text-primary rounded-lg sm:rounded-xl font-semibold text-[10px] sm:text-sm transition-all duration-300 hover:bg-white hover:border-gold-500 hover:shadow-soft"
          aria-label="Select language"
          data-no-translate
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gold-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
          <span className="hidden xs:inline truncate max-w-[60px] sm:max-w-none">
            {currentLanguage?.nativeName || currentLanguage?.name || 'English'}
          </span>
          <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {mounted && isOpen && buttonRect && createPortal(
        <>
          <div
            className="fixed inset-0"
            onClick={() => setIsOpen(false)}
            style={{ zIndex: 2147483646 }}
          />
          <div
            className="fixed bg-white rounded-xl shadow-2xl border-2 border-gold-200/50 min-w-[220px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-100px)] overflow-y-auto"
            style={{
              zIndex: 2147483647,
              top: `${buttonRect.bottom + 8}px`,
              ...(buttonRect.left < window.innerWidth / 2
                ? { left: `${Math.max(12, buttonRect.left)}px` }
                : { right: `${Math.max(12, window.innerWidth - buttonRect.right)}px` }),
              position: 'fixed'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {supportedLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full px-3 py-2 text-left hover:bg-gold-50 transition-colors flex items-center justify-between ${language === lang.code ? 'bg-gold-100 font-semibold' : ''
                  }`}
              >
                <div>
                  <div className="text-text-primary text-xs font-medium">{lang.nativeName}</div>
                  <div className="text-text-tertiary text-[10px]">{lang.name}</div>
                </div>
                {language === lang.code && (
                  <svg className="w-4 h-4 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  )
}
