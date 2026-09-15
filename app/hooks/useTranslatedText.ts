'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '@/app/contexts/TranslationContext'
import { translateText } from '@/lib/utils/translation'
import { getTranslation, TranslationKey, dictionaries } from '@/lib/i18n/translations'

/**
 * Hook that returns translated text and forces re-render when translation is ready
 * This ensures components update immediately when translations complete
 */
export function useTranslatedText(key: TranslationKey | string): string {
  const { language } = useTranslation()
  const [translatedText, setTranslatedText] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Get English text
    let englishText: string
    if (typeof key === 'string' && key.includes('.') && (key as string) in dictionaries.en) {
      englishText = getTranslation(key as TranslationKey)
    } else {
      englishText = key
    }

    if (language === 'en' || !englishText.trim()) {
      setTranslatedText(englishText)
      setIsReady(true)
      return
    }

    // Check if we have a cached translation
    const cacheKey = `${englishText}-${language}`
    const cached = (window as any).__i18nCache?.[cacheKey]
    
    if (cached) {
      setTranslatedText(cached)
      setIsReady(true)
      return
    }

    // Translate async
    translateText(englishText, language, 'en')
      .then(translated => {
        if (translated && translated !== englishText) {
          // Cache it globally
          if (!(window as any).__i18nCache) {
            (window as any).__i18nCache = {}
          }
          (window as any).__i18nCache[cacheKey] = translated
          setTranslatedText(translated)
          setIsReady(true)
          // No explicit forceUpdate needed: setTranslatedText re-renders this
          // hook's component on its own.
        } else {
          setTranslatedText(englishText)
          setIsReady(true)
        }
      })
      .catch(() => {
        setTranslatedText(englishText)
        setIsReady(true)
      })
  }, [key, language])

  return translatedText || (typeof key === 'string' && key.includes('.') && (key as string) in dictionaries.en 
    ? getTranslation(key as TranslationKey) 
    : key)
}
