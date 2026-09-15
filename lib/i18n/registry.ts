/**
 * Language registry - the single source of truth for what languages exist and
 * what each one can actually do.
 *
 * Before this file, five places kept their own list and they had drifted:
 * lib/i18n/index.ts, the header switcher, an abandoned switcher copy, the
 * settings dropdown, and the TTS voice map. Adding a language meant editing all
 * five. Everything now reads from here.
 *
 * The three capabilities are independent, and pretending otherwise is what
 * silently shipped English audio to non-English users:
 *
 *   dictionary  a hand-written, reviewed UI translation exists in lib/i18n/
 *   tts         Google Cloud Text-to-Speech ships a voice for this language
 *   translate   machine translation can render reading content
 *
 * Every language here supports translation. A language with `dictionary: false`
 * shows an English interface with translated reading content. A language with
 * `tts: null` gets no audio rather than audio in the wrong language.
 *
 * Curated: 19 languages with reviewed dictionaries.
 * Long tail: 113 translation-only languages.
 */

export interface TTSVoiceSpec {
  /** BCP-47 locale passed to the TTS provider, e.g. "kn-IN". */
  locale: string
  /**
   * Preferred voice name. Providers fall back to any voice for the locale when
   * this name is unavailable, so a stale name degrades instead of failing.
   */
  preferredVoice: string
}

export interface LanguageEntry {
  /** ISO 639-1 where one exists, otherwise the Google Translate code. */
  code: string
  /** English name. */
  name: string
  /** Endonym, shown in the language switcher. */
  nativeName: string
  /** True when lib/i18n/<code>.ts exists and has been reviewed. */
  dictionary: boolean
  /** Voice spec, or null when no voice exists for this language. */
  tts: TTSVoiceSpec | null
  /** Right-to-left script. */
  rtl?: boolean
}

/** Languages with reviewed UI dictionaries. */
export const CURATED_LANGUAGES: readonly LanguageEntry[] = [
  { code: 'en', name: 'English', nativeName: 'English', dictionary: true, tts: { locale: 'en-US', preferredVoice: 'en-US-Wavenet-C' } },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dictionary: true, tts: { locale: 'hi-IN', preferredVoice: 'hi-IN-Wavenet-A' } },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dictionary: true, tts: { locale: 'bn-IN', preferredVoice: 'bn-IN-Wavenet-A' } },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dictionary: true, tts: { locale: 'ta-IN', preferredVoice: 'ta-IN-Standard-A' } },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dictionary: true, tts: { locale: 'te-IN', preferredVoice: 'te-IN-Standard-A' } },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dictionary: true, tts: { locale: 'kn-IN', preferredVoice: 'kn-IN-Standard-A' } },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dictionary: true, tts: { locale: 'ml-IN', preferredVoice: 'ml-IN-Wavenet-A' } },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dictionary: true, tts: { locale: 'mr-IN', preferredVoice: 'mr-IN-Wavenet-A' } },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', dictionary: true, tts: { locale: 'gu-IN', preferredVoice: 'gu-IN-Standard-A' } },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dictionary: true, tts: { locale: 'es-ES', preferredVoice: 'es-ES-Wavenet-A' } },
  { code: 'fr', name: 'French', nativeName: 'Français', dictionary: true, tts: { locale: 'fr-FR', preferredVoice: 'fr-FR-Wavenet-A' } },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dictionary: true, tts: { locale: 'de-DE', preferredVoice: 'de-DE-Wavenet-A' } },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', dictionary: true, tts: { locale: 'it-IT', preferredVoice: 'it-IT-Wavenet-A' } },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dictionary: true, tts: { locale: 'pt-BR', preferredVoice: 'pt-BR-Wavenet-A' } },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dictionary: true, tts: { locale: 'ru-RU', preferredVoice: 'ru-RU-Wavenet-A' } },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dictionary: true, tts: { locale: 'ja-JP', preferredVoice: 'ja-JP-Wavenet-A' } },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dictionary: true, tts: { locale: 'ko-KR', preferredVoice: 'ko-KR-Wavenet-A' } },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dictionary: true, tts: { locale: 'cmn-CN', preferredVoice: 'cmn-CN-Wavenet-A' } },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dictionary: true, tts: { locale: 'ar-XA', preferredVoice: 'ar-XA-Wavenet-A' }, rtl: true },
]

/** Translation-only languages. English UI, translated reading content. */
export const LONG_TAIL_LANGUAGES: readonly LanguageEntry[] = [
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', dictionary: false, tts: { locale: 'af-ZA', preferredVoice: 'af-ZA-Standard-A' } },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', dictionary: false, tts: null },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', dictionary: false, tts: null },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', dictionary: false, tts: null },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', dictionary: false, tts: null },
  { code: 'ay', name: 'Aymara', nativeName: 'Aymar aru', dictionary: false, tts: null },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', dictionary: false, tts: null },
  { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan', dictionary: false, tts: null },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', dictionary: false, tts: { locale: 'eu-ES', preferredVoice: 'eu-ES-Standard-A' } },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', dictionary: false, tts: null },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी', dictionary: false, tts: null },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', dictionary: false, tts: null },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', dictionary: false, tts: { locale: 'bg-BG', preferredVoice: 'bg-BG-Standard-A' } },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', dictionary: false, tts: { locale: 'ca-ES', preferredVoice: 'ca-ES-Standard-A' } },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', dictionary: false, tts: null },
  { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa', dictionary: false, tts: null },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu', dictionary: false, tts: null },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', dictionary: false, tts: null },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', dictionary: false, tts: { locale: 'cs-CZ', preferredVoice: 'cs-CZ-Wavenet-A' } },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', dictionary: false, tts: { locale: 'da-DK', preferredVoice: 'da-DK-Wavenet-A' } },
  { code: 'dv', name: 'Divehi', nativeName: 'ދިވެހި', dictionary: false, tts: null, rtl: true },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', dictionary: false, tts: null },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', dictionary: false, tts: { locale: 'nl-NL', preferredVoice: 'nl-NL-Wavenet-A' } },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', dictionary: false, tts: null },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', dictionary: false, tts: null },
  { code: 'ee', name: 'Ewe', nativeName: 'Eʋegbe', dictionary: false, tts: null },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', dictionary: false, tts: { locale: 'fil-PH', preferredVoice: 'fil-PH-Wavenet-A' } },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', dictionary: false, tts: { locale: 'fi-FI', preferredVoice: 'fi-FI-Wavenet-A' } },
  { code: 'fy', name: 'Frisian', nativeName: 'Frysk', dictionary: false, tts: null },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', dictionary: false, tts: { locale: 'gl-ES', preferredVoice: 'gl-ES-Standard-A' } },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', dictionary: false, tts: null },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', dictionary: false, tts: { locale: 'el-GR', preferredVoice: 'el-GR-Wavenet-A' } },
  { code: 'gn', name: 'Guarani', nativeName: 'Avañeẽ', dictionary: false, tts: null },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl ayisyen', dictionary: false, tts: null },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', dictionary: false, tts: null },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', dictionary: false, tts: null },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', dictionary: false, tts: { locale: 'he-IL', preferredVoice: 'he-IL-Wavenet-A' }, rtl: true },
  { code: 'hmn', name: 'Hmong', nativeName: 'Hmoob', dictionary: false, tts: null },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', dictionary: false, tts: { locale: 'hu-HU', preferredVoice: 'hu-HU-Wavenet-A' } },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', dictionary: false, tts: { locale: 'is-IS', preferredVoice: 'is-IS-Standard-A' } },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', dictionary: false, tts: null },
  { code: 'ilo', name: 'Ilocano', nativeName: 'Ilokano', dictionary: false, tts: null },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', dictionary: false, tts: { locale: 'id-ID', preferredVoice: 'id-ID-Wavenet-A' } },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', dictionary: false, tts: null },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', dictionary: false, tts: { locale: 'jv-ID', preferredVoice: 'jv-ID-Standard-A' } },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', dictionary: false, tts: null },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', dictionary: false, tts: { locale: 'km-KH', preferredVoice: 'km-KH-Standard-A' } },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Kinyarwanda', dictionary: false, tts: null },
  { code: 'gom', name: 'Konkani', nativeName: 'कोंकणी', dictionary: false, tts: null },
  { code: 'kri', name: 'Krio', nativeName: 'Krio', dictionary: false, tts: null },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî', dictionary: false, tts: null },
  { code: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'کوردیی ناوەندی', dictionary: false, tts: null, rtl: true },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', dictionary: false, tts: null },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', dictionary: false, tts: null },
  { code: 'la', name: 'Latin', nativeName: 'Latina', dictionary: false, tts: null },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', dictionary: false, tts: { locale: 'lv-LV', preferredVoice: 'lv-LV-Standard-A' } },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingála', dictionary: false, tts: null },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', dictionary: false, tts: { locale: 'lt-LT', preferredVoice: 'lt-LT-Standard-A' } },
  { code: 'lg', name: 'Luganda', nativeName: 'Luganda', dictionary: false, tts: null },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', dictionary: false, tts: null },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', dictionary: false, tts: null },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', dictionary: false, tts: null },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', dictionary: false, tts: null },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', dictionary: false, tts: { locale: 'ms-MY', preferredVoice: 'ms-MY-Wavenet-A' } },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', dictionary: false, tts: null },
  { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori', dictionary: false, tts: null },
  { code: 'mni', name: 'Meiteilon', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ', dictionary: false, tts: null },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng', dictionary: false, tts: null },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', dictionary: false, tts: null },
  { code: 'my', name: 'Myanmar', nativeName: 'မြန်မာ', dictionary: false, tts: null },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', dictionary: false, tts: null },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', dictionary: false, tts: { locale: 'nb-NO', preferredVoice: 'nb-NO-Wavenet-A' } },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', dictionary: false, tts: null },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', dictionary: false, tts: null },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', dictionary: false, tts: null, rtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dictionary: false, tts: null, rtl: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', dictionary: false, tts: { locale: 'pl-PL', preferredVoice: 'pl-PL-Wavenet-A' } },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', dictionary: false, tts: { locale: 'pa-IN', preferredVoice: 'pa-IN-Wavenet-A' } },
  { code: 'qu', name: 'Quechua', nativeName: 'Runa Simi', dictionary: false, tts: null },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', dictionary: false, tts: { locale: 'ro-RO', preferredVoice: 'ro-RO-Wavenet-A' } },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Sāmoa', dictionary: false, tts: null },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', dictionary: false, tts: null },
  { code: 'gd', name: 'Scots Gaelic', nativeName: 'Gàidhlig', dictionary: false, tts: null },
  { code: 'nso', name: 'Sepedi', nativeName: 'Sepedi', dictionary: false, tts: null },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', dictionary: false, tts: { locale: 'sr-RS', preferredVoice: 'sr-RS-Standard-A' } },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho', dictionary: false, tts: null },
  { code: 'sn', name: 'Shona', nativeName: 'ChiShona', dictionary: false, tts: null },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', dictionary: false, tts: null, rtl: true },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', dictionary: false, tts: null },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', dictionary: false, tts: { locale: 'sk-SK', preferredVoice: 'sk-SK-Wavenet-A' } },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', dictionary: false, tts: null },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', dictionary: false, tts: null },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', dictionary: false, tts: { locale: 'su-ID', preferredVoice: 'su-ID-Standard-A' } },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dictionary: false, tts: null },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', dictionary: false, tts: { locale: 'sv-SE', preferredVoice: 'sv-SE-Wavenet-A' } },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', dictionary: false, tts: null },
  { code: 'tt', name: 'Tatar', nativeName: 'Татарча', dictionary: false, tts: null },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', dictionary: false, tts: { locale: 'th-TH', preferredVoice: 'th-TH-Standard-A' } },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', dictionary: false, tts: null },
  { code: 'ts', name: 'Tsonga', nativeName: 'Xitsonga', dictionary: false, tts: null },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dictionary: false, tts: { locale: 'tr-TR', preferredVoice: 'tr-TR-Wavenet-A' } },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen', dictionary: false, tts: null },
  { code: 'ak', name: 'Twi', nativeName: 'Twi', dictionary: false, tts: null },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', dictionary: false, tts: { locale: 'uk-UA', preferredVoice: 'uk-UA-Wavenet-A' } },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dictionary: false, tts: { locale: 'ur-IN', preferredVoice: 'ur-IN-Wavenet-A' }, rtl: true },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', dictionary: false, tts: null, rtl: true },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha', dictionary: false, tts: null },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', dictionary: false, tts: { locale: 'vi-VN', preferredVoice: 'vi-VN-Wavenet-A' } },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', dictionary: false, tts: null },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', dictionary: false, tts: null },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', dictionary: false, tts: null, rtl: true },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', dictionary: false, tts: null },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', dictionary: false, tts: null },
]

export const LANGUAGES: readonly LanguageEntry[] = [
  ...CURATED_LANGUAGES,
  ...LONG_TAIL_LANGUAGES,
]

const BY_CODE: ReadonlyMap<string, LanguageEntry> = new Map(
  LANGUAGES.map((l) => [l.code, l])
)

export const DEFAULT_LANGUAGE = 'en'

/** Look up a language, or null when the code is unknown. */
export function getLanguage(code: string | null | undefined): LanguageEntry | null {
  if (!code) return null
  return BY_CODE.get(code.trim().toLowerCase()) ?? null
}

/** True when the code is in the registry at all. */
export function isSupportedLanguage(code: string | null | undefined): boolean {
  return getLanguage(code) !== null
}

/**
 * Coerce any value to a usable language code.
 * Unknown codes fall back to English rather than propagating a bad value into
 * the TTS provider or the dictionary lookup.
 */
export function resolveLanguage(code: string | null | undefined): string {
  return getLanguage(code)?.code ?? DEFAULT_LANGUAGE
}

/** Languages offered in the UI switcher - those with a reviewed dictionary. */
export function getDictionaryLanguages(): LanguageEntry[] {
  return LANGUAGES.filter((l) => l.dictionary)
}

/** Every language offered for reading content, dictionary or not. */
export function getSelectableLanguages(): LanguageEntry[] {
  return [...LANGUAGES]
}

/** True when a hand-written UI dictionary exists for this language. */
export function hasDictionary(code: string | null | undefined): boolean {
  return getLanguage(code)?.dictionary ?? false
}

/**
 * Voice spec for a language, or null when no voice exists.
 *
 * Callers MUST treat null as "produce no audio". Substituting an English voice
 * hands the user a reading they cannot understand, which is what the previous
 * hardcoded fallback did.
 */
export function getVoiceSpec(code: string | null | undefined): TTSVoiceSpec | null {
  return getLanguage(code)?.tts ?? null
}

/** True when audio can be produced in this language. */
export function hasVoice(code: string | null | undefined): boolean {
  return getVoiceSpec(code) !== null
}

/** True when the language is written right-to-left. */
export function isRTLLanguage(code: string | null | undefined): boolean {
  return getLanguage(code)?.rtl === true
}

/**
 * Which language the interface should render in.
 * A language without a dictionary shows English chrome while its reading
 * content is still translated - an honest degrade rather than a broken UI.
 */
export function getUILanguage(code: string | null | undefined): string {
  return hasDictionary(code) ? resolveLanguage(code) : DEFAULT_LANGUAGE
}
