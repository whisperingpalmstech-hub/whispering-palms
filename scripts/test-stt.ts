/**
 * STT layer test.
 *
 * Runs offline with no credentials. Verifies the guard rails around voice
 * questions: unsupported formats and oversized recordings are rejected before
 * any provider is called, and an unconfigured install fails with a message the
 * user can act on rather than a stack trace.
 *
 * Run with: npm run test:stt
 */

import {
  ACCEPTED_AUDIO_TYPES,
  MAX_AUDIO_BYTES,
  isAcceptedAudioType,
} from '../lib/services/stt'

let failures = 0

const pass = (m: string) => console.log(`  ✅ ${m}`)
const fail = (m: string, d?: string) => {
  failures++
  console.log(`  ❌ ${m}${d ? ` — ${d}` : ''}`)
}

function section(t: string) {
  console.log(`\n${t}`)
  console.log('-'.repeat(t.length))
}

async function expectRejection(fn: () => Promise<unknown>, match: RegExp, label: string) {
  try {
    await fn()
    fail(label, 'no error thrown')
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (match.test(message)) pass(`${label} — "${message}"`)
    else fail(label, message)
  }
}

async function main() {
  console.log('STT layer verification')
  console.log('======================')

  delete process.env.OPENAI_API_KEY
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS
  delete process.env.STT_PROVIDER

  const stt = await import('../lib/services/stt')

  section('Format checks')
  for (const type of ACCEPTED_AUDIO_TYPES) {
    if (isAcceptedAudioType(type)) pass(`${type} accepted`)
    else fail(`${type} should be accepted`)
  }

  if (isAcceptedAudioType('audio/webm;codecs=opus')) pass('codec parameters are ignored')
  else fail('codec parameters broke the check')

  if (!isAcceptedAudioType('video/mp4')) pass('video/mp4 rejected')
  else fail('video/mp4 was accepted')

  if (!isAcceptedAudioType('application/octet-stream')) pass('octet-stream rejected')
  else fail('octet-stream was accepted')

  section('Input guards run before any provider call')

  await expectRejection(
    () => stt.transcribe({ audio: Buffer.alloc(0), mimeType: 'audio/webm' }),
    /empty/i,
    'empty recording rejected'
  )

  await expectRejection(
    () => stt.transcribe({ audio: Buffer.alloc(MAX_AUDIO_BYTES + 1), mimeType: 'audio/webm' }),
    /too long/i,
    'oversized recording rejected'
  )

  await expectRejection(
    () => stt.transcribe({ audio: Buffer.from('x'), mimeType: 'application/pdf' }),
    /unsupported audio format/i,
    'wrong format rejected'
  )

  section('Unconfigured install')

  if (!stt.isTranscriptionAvailable()) pass('isTranscriptionAvailable is false with no credentials')
  else fail('claimed transcription is available with no credentials')

  await expectRejection(
    () => stt.transcribe({ audio: Buffer.from('audio'), mimeType: 'audio/webm' }),
    /type your question/i,
    'unconfigured install tells the user to type instead'
  )

  section('Provider pinning')

  process.env.STT_PROVIDER = 'none'
  const status = stt.getSTTStatus()
  if (status.providers.length === 0) pass('STT_PROVIDER=none disables every provider')
  else fail('STT_PROVIDER=none still listed providers', JSON.stringify(status.providers))

  process.env.STT_PROVIDER = 'whisper'
  const pinned = stt.getSTTStatus()
  if (pinned.providers.length === 1 && pinned.providers[0].name === 'whisper') {
    pass('STT_PROVIDER=whisper pins a single provider')
  } else {
    fail('pinning whisper did not work', JSON.stringify(pinned.providers))
  }
  delete process.env.STT_PROVIDER

  section('Result')
  if (failures === 0) console.log('  ✅ STT layer is correct.')
  else console.log(`  ❌ ${failures} check(s) failed.`)
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
