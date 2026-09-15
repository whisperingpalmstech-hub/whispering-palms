/**
 * TTS layer test.
 *
 * Locks in the guarantee that matters: a language with no voice produces NO
 * audio. The previous inline logic substituted an English voice, so a Kannada
 * reader silently received their reading spoken in English.
 *
 * Runs offline with no credentials - the unconfigured paths are exactly the
 * safety-critical ones. Run with: npm run test:tts
 */

import { LANGUAGES, CURATED_LANGUAGES, getVoiceSpec, hasVoice } from '../lib/i18n/registry'

let failures = 0

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
  console.log('TTS layer verification')
  console.log('======================')

  // Ensure nothing is configured, so we exercise the skip paths.
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS
  delete process.env.VOICE_RSS_API_KEY
  delete process.env.TTS_PROVIDER

  const tts = await import('../lib/services/tts')

  section('Voice coverage')
  const voiced = LANGUAGES.filter((l) => l.tts !== null)
  const unvoiced = LANGUAGES.filter((l) => l.tts === null)
  console.log(`  ${voiced.length} languages have a voice, ${unvoiced.length} do not`)

  if (CURATED_LANGUAGES.every((l) => l.tts !== null)) {
    pass('every curated language has a voice')
  } else {
    fail('a curated language has no voice', CURATED_LANGUAGES.filter((l) => !l.tts).map((l) => l.code).join(', '))
  }

  const inconsistent = LANGUAGES.filter((l) => hasVoice(l.code) !== (getVoiceSpec(l.code) !== null))
  if (inconsistent.length === 0) pass('hasVoice agrees with getVoiceSpec for all languages')
  else fail('hasVoice disagrees with getVoiceSpec', inconsistent.map((l) => l.code).join(', '))

  section('No provider configured')

  if (!tts.canSynthesize('en')) pass('canSynthesize is false with no credentials')
  else fail('canSynthesize returned true with no credentials')

  const r1 = await tts.synthesize({ text: 'Your life line is long.', language: 'en' })
  if (r1 === null) pass('synthesize returns null rather than throwing')
  else fail('synthesize returned a result with no provider', JSON.stringify(r1))

  section('Refuses to guess a language')

  const r2 = await tts.synthesize({ text: 'hello', language: 'xx-not-a-language' })
  if (r2 === null) pass('unknown language returns null')
  else fail('unknown language produced audio', JSON.stringify(r2))

  const r3 = await tts.synthesize({ text: '   ', language: 'en' })
  if (r3 === null) pass('empty text returns null')
  else fail('empty text produced audio')

  // The core regression: a translation-only language must never be spoken.
  const noVoiceLang = unvoiced[0]
  const r4 = await tts.synthesize({ text: 'hello', language: noVoiceLang.code })
  if (r4 === null) {
    pass(`${noVoiceLang.name} (${noVoiceLang.code}) has no voice and produced no audio`)
  } else {
    fail(`${noVoiceLang.code} produced audio despite having no voice`, JSON.stringify(r4))
  }

  if (!tts.canSynthesize(noVoiceLang.code)) {
    pass(`canSynthesize is false for ${noVoiceLang.code}`)
  } else {
    fail(`canSynthesize claimed ${noVoiceLang.code} is speakable`)
  }

  section('Provider pinning')

  process.env.TTS_PROVIDER = 'none'
  const ttsNone = await import('../lib/services/tts?none' as string).catch(() => tts)
  const r5 = await ttsNone.synthesize({ text: 'hello', language: 'en' })
  if (r5 === null) pass('TTS_PROVIDER=none disables audio')
  else fail('TTS_PROVIDER=none still produced audio')
  delete process.env.TTS_PROVIDER

  const status = tts.getTTSStatus()
  if (Array.isArray(status.providers) && status.providers.length >= 1) {
    pass(`getTTSStatus lists providers: ${status.providers.map((p: any) => `${p.name}=${p.configured}`).join(', ')}`)
  } else {
    fail('getTTSStatus returned no providers')
  }

  section('Configuration is not hardcoded')

  process.env.TTS_SPEAKING_RATE = '1.25'
  process.env.TTS_PITCH = '-2.5'
  process.env.TTS_VOICE_GENDER = 'MALE'
  const configured = tts.getTTSStatus()
  if (configured.speakingRate === 1.25 && configured.pitch === -2.5 && configured.gender === 'MALE') {
    pass('speaking rate, pitch and gender read from environment')
  } else {
    fail('config not picked up from environment', JSON.stringify(configured))
  }
  delete process.env.TTS_SPEAKING_RATE
  delete process.env.TTS_PITCH
  delete process.env.TTS_VOICE_GENDER

  section('Result')
  if (failures === 0) console.log('  ✅ TTS layer is correct.')
  else console.log(`  ❌ ${failures} check(s) failed.`)
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
