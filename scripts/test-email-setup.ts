/**
 * End-to-end verification of the email stack.
 *
 * Run with: npm run test:email -- you@example.com
 *
 * Proves, in order:
 *   1. The app's own SMTP credentials authenticate against the relay.
 *   2. The relay actually accepts and delivers a message from our sender.
 *   3. Supabase Auth is relaying through custom SMTP - verified by driving
 *      more signups in one run than the built-in sender's ~2/hour cap allows.
 *   4. Password reset mail sends.
 *   5. Test users are removed afterwards.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { closeMailer, getMailerStatus, sendMail, verifyMailer } from '../lib/services/mailer'
import { isEmailSendError, isRateLimitError } from '../lib/auth/errors'

const recipient = process.argv[2]

/**
 * How many signups to attempt. Must exceed the built-in sender's ~2/hour cap,
 * otherwise a pass proves nothing about whether custom SMTP is live.
 */
const SIGNUP_PROBE_COUNT = parseInt(process.env.EMAIL_TEST_SIGNUP_COUNT || '5', 10)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let failures = 0

function pass(message: string) {
  console.log(`  ✅ ${message}`)
}

function fail(message: string, detail?: unknown) {
  failures++
  console.error(`  ❌ ${message}`)
  if (detail) console.error(`     ${detail instanceof Error ? detail.message : String(detail)}`)
}

function section(title: string) {
  console.log(`\n${title}`)
  console.log('-'.repeat(title.length))
}

/**
 * Address that routes back to the caller's inbox via plus-addressing, so the
 * signup probes deliver somewhere real and observable.
 */
function probeAddress(base: string): string {
  const [local, domain] = base.split('@')
  return `${local}+wptest-${randomUUID().slice(0, 8)}@${domain}`
}

async function main() {
  console.log('Whispering Palms - email stack verification')
  console.log('===========================================')

  if (!recipient || !recipient.includes('@')) {
    console.error('\nUsage: npm run test:email -- you@example.com')
    console.error('Pass a real inbox you can check. Signup probes use plus-addressing on it.')
    process.exit(1)
  }

  // -- 1. Configuration ----------------------------------------------------
  section('1. Mailer configuration')
  const status = getMailerStatus()
  console.log(`  provider : ${status.provider}`)
  if ('host' in status) {
    console.log(`  host     : ${status.host}:${status.port} (secure=${status.secure})`)
    console.log(`  user     : ${status.user}`)
  }
  console.log(`  from     : ${status.from}`)

  if (!status.configured) {
    fail('Mailer is not fully configured. Set SMTP_HOST/SMTP_USER/SMTP_PASSWORD and EMAIL_FROM in .env.local')
    process.exit(1)
  }
  pass('All required mailer variables are present')

  // -- 2. SMTP handshake ---------------------------------------------------
  section('2. SMTP authentication')
  try {
    const result = await verifyMailer()
    pass(`Authenticated against ${result.host ?? result.provider}`)
  } catch (error) {
    fail('SMTP authentication failed', error)
    console.error('\n     For ZeptoMail the SMTP username is literally "emailapikey" and')
    console.error('     SMTP_PASSWORD is the Send Mail token from the ZeptoMail console.')
    process.exit(1)
  }

  // -- 3. Real delivery ----------------------------------------------------
  section('3. Test message delivery')
  try {
    const { messageId } = await sendMail({
      to: recipient,
      subject: 'Whispering Palms - SMTP relay test',
      html: `<p>SMTP relay is working.</p><p>Provider: <strong>${status.provider}</strong></p><p>Sent at ${new Date().toISOString()}</p>`,
      text: `SMTP relay is working. Provider: ${status.provider}. Sent at ${new Date().toISOString()}`,
    })
    pass(`Message accepted by relay (id ${messageId})`)
    console.log(`     Check ${recipient} - confirm it landed in the inbox, not spam.`)
  } catch (error) {
    fail('Relay rejected the test message', error)
  }

  // -- 4. Supabase Auth custom SMTP ---------------------------------------
  section('4. Supabase Auth custom SMTP')

  if (!supabaseUrl || !supabaseAnonKey) {
    fail('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing - skipping auth checks')
    process.exit(failures > 0 ? 1 : 0)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const createdUserIds: string[] = []

  console.log(`  Driving ${SIGNUP_PROBE_COUNT} signups. The built-in Supabase sender caps at ~2/hour,`)
  console.log('  so more than 2 succeeding proves custom SMTP is handling the mail.\n')

  let succeeded = 0
  for (let i = 1; i <= SIGNUP_PROBE_COUNT; i++) {
    const email = probeAddress(recipient)
    const { data, error } = await supabase.auth.signUp({
      email,
      password: `Test-${randomUUID()}`,
      options: {
        emailRedirectTo: `${appUrl}/api/auth/callback`,
        data: { name: 'Email Setup Probe' },
      },
    })

    if (error) {
      if (isRateLimitError(error)) {
        fail(`Signup ${i}/${SIGNUP_PROBE_COUNT} hit a rate limit: ${error.message}`)
        console.error('     Custom SMTP is NOT active, or the Auth rate limit is set too low.')
        console.error('     Dashboard -> Authentication -> Rate Limits -> "Rate limit for sending emails".')
      } else if (isEmailSendError(error)) {
        fail(`Signup ${i}/${SIGNUP_PROBE_COUNT} - Supabase could not reach the relay: ${error.message}`)
        console.error('     Re-check the SMTP settings saved in the Supabase dashboard.')
      } else {
        fail(`Signup ${i}/${SIGNUP_PROBE_COUNT} failed: ${error.message}`)
      }
      break
    }

    if (data.user) createdUserIds.push(data.user.id)
    succeeded++
    console.log(`  ✅ Signup ${i}/${SIGNUP_PROBE_COUNT} accepted (${email})`)
  }

  if (succeeded > 2) {
    pass(`${succeeded} confirmation emails sent without hitting a limit - custom SMTP confirmed`)
  } else if (succeeded > 0) {
    fail(`Only ${succeeded} signup(s) succeeded - not enough to rule out the built-in sender`)
  }

  // -- 5. Password reset ---------------------------------------------------
  section('5. Password reset email')
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(recipient, {
    redirectTo: `${appUrl}/api/auth/callback?next=/reset-password`,
  })

  if (resetError) {
    if (isRateLimitError(resetError)) {
      fail(`Password reset hit a rate limit: ${resetError.message}`)
    } else {
      fail('Password reset send failed', resetError)
    }
  } else {
    pass(`Reset email dispatched to ${recipient}`)
  }

  // -- 6. Cleanup ----------------------------------------------------------
  section('6. Cleanup')
  if (createdUserIds.length === 0) {
    console.log('  Nothing to clean up.')
  } else if (!supabaseServiceKey) {
    fail(`SUPABASE_SERVICE_ROLE_KEY not set - ${createdUserIds.length} test user(s) left behind`)
    createdUserIds.forEach((id) => console.error(`     ${id}`))
  } else {
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    for (const id of createdUserIds) {
      // Remove the public row first; it has FK children cascading from it.
      await admin.from('users').delete().eq('id', id)
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) {
        fail(`Could not delete test user ${id}`, error)
      }
    }
    pass(`Removed ${createdUserIds.length} test user(s)`)
  }

  // -- Summary -------------------------------------------------------------
  section('Result')
  if (failures === 0) {
    console.log('  ✅ Email stack is working. Safe to deploy.')
    console.log(`\n  Manual step: open ${recipient} and confirm the messages arrived`)
    console.log('  in the inbox rather than spam, and that the confirmation link works.')
  } else {
    console.log(`  ❌ ${failures} check(s) failed. Do not deploy until these pass.`)
  }

  await closeMailer()
  process.exit(failures > 0 ? 1 : 0)
}

main().catch(async (error) => {
  console.error('\nUnexpected error:', error)
  await closeMailer().catch(() => {})
  process.exit(1)
})
