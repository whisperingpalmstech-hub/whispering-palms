/**
 * i18n Dictionary Index
 *
 * Which languages exist is declared in lib/i18n/registry.ts, not here. This file
 * only binds the dictionary modules to their codes; the registry decides what is
 * offered, what has a voice, and what falls back to English.
 *
 * To add a language:
 * 1. Add the entry to CURATED_LANGUAGES in registry.ts with dictionary: true
 * 2. Create lib/i18n/{lang}.ts with the same keys as en.ts
 * 3. Import and add it to `dictionaries` below
 *
 * `npm run test:i18n` fails if a language claims a dictionary it does not have,
 * or has a dictionary missing keys that en.ts defines.
 */

import { getLanguage, isRTLLanguage, resolveLanguage, DEFAULT_LANGUAGE } from './registry'

import en from './en'
import hi from './hi'
import bn from './bn'
import ta from './ta'
import te from './te'
import kn from './kn'
import ml from './ml'
import mr from './mr'
import gu from './gu'
import es from './es'
import fr from './fr'
import de from './de'
import it from './it'
import pt from './pt'
import ru from './ru'
import ja from './ja'
import ko from './ko'
import zh from './zh'
import ar from './ar'

export type TranslationKey = keyof typeof en

export interface Dictionary {
  [key: string]: string
}

export const dictionaries: Record<string, Dictionary> = {
  en,
  hi,
  bn,
  ta,
  te,
  kn,
  ml,
  mr,
  gu,
  es,
  fr,
  de,
  it,
  pt,
  ru,
  ja,
  ko,
  zh,
  ar,
}

/**
 * Get translation for a key in the specified language.
 * Falls back to English if key or language is missing.
 * NEVER throws or fetches from network.
 */
export function getTranslation(key: TranslationKey, lang: string = DEFAULT_LANGUAGE): string {
  const dict = dictionaries[lang] ?? dictionaries[DEFAULT_LANGUAGE]
  return dict[key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key
}

/** Check if language is RTL. Delegates to the registry. */
export function isRTL(lang: string): boolean {
  return isRTLLanguage(lang)
}

/** Language codes that have a loaded dictionary. */
export function getSupportedLanguages(): string[] {
  return Object.keys(dictionaries)
}

/** True when a dictionary is actually loaded for this code. */
export function isLanguageSupported(lang: string): boolean {
  return lang in dictionaries
}

export {
  getLanguage,
  resolveLanguage,
  DEFAULT_LANGUAGE,
}
export {
  LANGUAGES,
  CURATED_LANGUAGES,
  LONG_TAIL_LANGUAGES,
  getDictionaryLanguages,
  getSelectableLanguages,
  getVoiceSpec,
  hasVoice,
  hasDictionary,
  getUILanguage,
  isSupportedLanguage,
  type LanguageEntry,
  type TTSVoiceSpec,
} from './registry'
