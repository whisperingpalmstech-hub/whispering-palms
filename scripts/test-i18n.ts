/**
 * i18n consistency test.
 *
 * The registry declares what each language can do. This checks the declaration
 * against reality, so a language cannot claim a capability it does not have -
 * the failure mode that stranded a 37-language list in an unused file and
 * silently shipped English audio to non-English users.
 *
 * Run with: npm run test:i18n
 */

import { existsSync } from 'fs'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

import { LANGUAGES, CURATED_LANGUAGES, LONG_TAIL_LANGUAGES } from '../lib/i18n/registry'
import en from '../lib/i18n/en'

const ROOT = process.cwd()
let failures = 0

/**
 * Values that are empty on purpose.
 *
 * plan.plan is a trailing word in English ("you are already on the Basic plan").
 * Languages that put the noun before the name fold it into plan.alreadyOnPlan
 * and leave this blank. Listing them here keeps a genuinely accidental empty
 * value a failure.
 */
const DELIBERATELY_EMPTY: Readonly<Record<string, readonly string[]>> = {
  es: ['plan.plan'],
  fr: ['plan.plan'],
  it: ['plan.plan'],
  pt: ['plan.plan'],
  ru: ['plan.plan'],
  ar: ['plan.plan'],
}

function pass(msg: string) {
  console.log(`  ✅ ${msg}`)
}

function fail(msg: string, detail?: string) {
  failures++
  console.log(`  ❌ ${msg}`)
  if (detail) console.log(`     ${detail}`)
}

function section(title: string) {
  console.log(`\n${title}`)
  console.log('-'.repeat(title.length))
}

async function main() {
  const baseKeys = Object.keys(en).sort()
  console.log(`Registry: ${LANGUAGES.length} languages ` +
    `(${CURATED_LANGUAGES.length} curated, ${LONG_TAIL_LANGUAGES.length} long tail)`)
  console.log(`Base dictionary: ${baseKeys.length} keys\n`)

  // --- registry integrity ---
  section('Registry integrity')

  const codes = LANGUAGES.map((l) => l.code)
  const dupes = codes.filter((c, i) => codes.indexOf(c) !== i)
  if (dupes.length) fail('duplicate language codes', [...new Set(dupes)].join(', '))
  else pass('no duplicate language codes')

  const badLocale = LANGUAGES.filter(
    (l) => l.tts && !/^[a-z]{2,3}-[A-Z]{2}$/.test(l.tts.locale)
  )
  if (badLocale.length) fail('malformed TTS locale', badLocale.map((l) => `${l.code}:${l.tts!.locale}`).join(', '))
  else pass('every TTS locale is well-formed BCP-47')

  const badVoice = LANGUAGES.filter(
    (l) => l.tts && !l.tts.preferredVoice.startsWith(l.tts.locale)
  )
  if (badVoice.length) fail('voice name does not match its locale', badVoice.map((l) => l.code).join(', '))
  else pass('every preferred voice matches its locale')

  const tailClaimingDict = LONG_TAIL_LANGUAGES.filter((l) => l.dictionary)
  if (tailClaimingDict.length) fail('long-tail language claims a dictionary', tailClaimingDict.map((l) => l.code).join(', '))
  else pass('no long-tail language claims a dictionary')

  // --- dictionary files exist for everything that claims one ---
  section('Declared dictionaries exist')

  const claiming = LANGUAGES.filter((l) => l.dictionary)
  const missingFiles: string[] = []

  for (const lang of claiming) {
    if (!existsSync(resolve(ROOT, `lib/i18n/${lang.code}.ts`))) {
      missingFiles.push(lang.code)
    }
  }

  if (missingFiles.length) {
    fail(`${missingFiles.length} language(s) claim a dictionary with no file`, missingFiles.join(', '))
  } else {
    pass(`all ${claiming.length} declared dictionaries have a file`)
  }

  // --- key parity ---
  section('Key parity with en.ts')

  for (const lang of claiming) {
    const path = resolve(ROOT, `lib/i18n/${lang.code}.ts`)
    if (!existsSync(path)) continue

    const mod = await import(pathToFileURL(path).href)
    const dict = mod.default as Record<string, string>
    const keys = Object.keys(dict).sort()

    const missing = baseKeys.filter((k) => !(k in dict))
    const extra = keys.filter((k) => !(k in en))
    const allowedEmpty = DELIBERATELY_EMPTY[lang.code] ?? []
    const empty = baseKeys.filter(
      (k) => k in dict && !String(dict[k]).trim() && !allowedEmpty.includes(k)
    )
    // A value identical to English is a real signal for a non-Latin script:
    // it almost always means the key was copied and never translated.
    const untranslated =
      lang.code === 'en'
        ? []
        : baseKeys.filter(
            (k) =>
              dict[k] === (en as Record<string, string>)[k] &&
              // Brand names, placeholders and codes legitimately match.
              !/^[\s\W\d]*$/.test(String(dict[k])) &&
              !['auth.emailPlaceholder'].includes(k)
          )

    const problems: string[] = []
    if (missing.length) problems.push(`${missing.length} missing (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''})`)
    if (extra.length) problems.push(`${extra.length} unknown (${extra.slice(0, 3).join(', ')}${extra.length > 3 ? '…' : ''})`)
    if (empty.length) problems.push(`${empty.length} empty`)

    if (problems.length) {
      fail(`${lang.code} (${lang.name})`, problems.join('; '))
    } else if (untranslated.length > baseKeys.length * 0.1) {
      fail(
        `${lang.code} (${lang.name})`,
        `${untranslated.length}/${baseKeys.length} values identical to English - likely untranslated`
      )
    } else {
      const note = untranslated.length ? ` (${untranslated.length} same as English)` : ''
      pass(`${lang.code} (${lang.name}) - ${keys.length} keys${note}`)
    }
  }

  // --- the index binds every declared dictionary ---
  section('Index bindings')

  if (missingFiles.length === 0) {
    const idx = await import(pathToFileURL(resolve(ROOT, 'lib/i18n/index.ts')).href)
    const loaded: string[] = idx.getSupportedLanguages()
    const declared = claiming.map((l) => l.code)

    const notBound = declared.filter((c) => !loaded.includes(c))
    const boundButUndeclared = loaded.filter((c) => !declared.includes(c))

    if (notBound.length) fail('declared but not imported in index.ts', notBound.join(', '))
    else pass('every declared dictionary is bound in index.ts')

    if (boundButUndeclared.length) fail('imported in index.ts but not declared', boundButUndeclared.join(', '))
    else pass('index.ts binds nothing the registry does not declare')
  } else {
    fail('skipped - dictionary files are missing')
  }

  section('Result')
  if (failures === 0) {
    console.log('  ✅ i18n is consistent.')
  } else {
    console.log(`  ❌ ${failures} check(s) failed.`)
  }
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
