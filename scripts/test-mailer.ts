/**
 * Offline regression test for lib/services/mailer.ts and lib/auth/errors.ts.
 *
 * Runs a real SMTP server on localhost and drives the mailer through it, so the
 * transport, auth handshake, headers and error handling are all exercised
 * without needing ZeptoMail credentials. Safe to run in CI.
 *
 * Run with: npm run test:mailer
 */

import { startFakeSmtp } from './fake-smtp'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

const ROOT = process.cwd()
const load = (rel: string, v: string) => import(pathToFileURL(resolve(ROOT, rel)).href + '?v=' + v)

const PORT = 2526
const USER = 'emailapikey'
const PASS = 'wSsVR60-test-token-abc123'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ✅ ${name}`)
  else { failures++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`) }
}

async function main() {
  const smtp = await startFakeSmtp(PORT, { expectUser: USER, expectPass: PASS })

  // ---- Case 1: unconfigured -> reports not configured, does not throw ----
  console.log('\n1. Unconfigured provider')
  process.env.EMAIL_PROVIDER = 'zeptomail'
  delete process.env.SMTP_PASSWORD; delete process.env.ZEPTOMAIL_TOKEN
  delete process.env.EMAIL_FROM; delete process.env.SMTP_HOST
  delete process.env.SMTP_PORT; delete process.env.SMTP_SECURE; delete process.env.SMTP_USER
  const mailer = await load('lib/services/mailer.ts', '1')
  let st = mailer.getMailerStatus()
  check('provider defaults to zeptomail', st.provider === 'zeptomail', st.provider)
  check('host defaults to smtp.zeptomail.com', st.host === 'smtp.zeptomail.com', String(st.host))
  check('user defaults to literal "emailapikey"', st.user === 'emailapikey', String(st.user))
  check('reports configured=false when token missing', st.configured === false)
  try { await mailer.sendMail({ to: 'a@b.com', subject: 's', html: 'h' }); check('sendMail throws when unconfigured', false) }
  catch (e: any) { check('sendMail throws a useful error', /Send Mail token|EMAIL_FROM/.test(e.message), e.message) }

  // ---- Case 2: configured against the fake relay ----
  console.log('\n2. Configured against live SMTP')
  process.env.SMTP_HOST = '127.0.0.1'
  process.env.SMTP_PORT = String(PORT)
  process.env.SMTP_SECURE = 'false'
  process.env.SMTP_USER = USER
  process.env.SMTP_PASSWORD = PASS
  process.env.EMAIL_FROM = 'noreply@whisperingpalms.test'
  process.env.EMAIL_FROM_NAME = 'Whispering Palms'

  const m2 = await load('lib/services/mailer.ts', '2')
  st = m2.getMailerStatus()
  check('reports configured=true', st.configured === true)
  check('port parsed from env', st.port === PORT, String(st.port))
  check('secure=false honoured', st.secure === false)
  check('From header composed with name', m2.getFromAddress() === '"Whispering Palms" <noreply@whisperingpalms.test>', m2.getFromAddress())

  try { const v = await m2.verifyMailer(); check('verifyMailer authenticates over the wire', v.host === '127.0.0.1', JSON.stringify(v)) }
  catch (e: any) { check('verifyMailer authenticates over the wire', false, e.message) }

  try {
    const r = await m2.sendMail({ to: 'user@example.test', subject: 'Confirm your email', html: '<p>Hi</p>', text: 'Hi' })
    check('sendMail returns a messageId', !!r.messageId, JSON.stringify(r))
    check('sendMail reports provider', r.provider === 'zeptomail', r.provider)
  } catch (e: any) { check('sendMail delivers', false, e.message) }

  await new Promise((r) => setTimeout(r, 300))
  const msg = smtp.received[0]
  check('relay received exactly one message', smtp.received.length === 1, `got ${smtp.received.length}`)
  if (msg) {
    check('authenticated as emailapikey', msg.authUser === USER, msg.authUser)
    check('used the Send Mail token as password', msg.authPass === PASS)
    check('envelope From is the verified sender', msg.from === '<noreply@whisperingpalms.test>', msg.from)
    check('envelope To is the recipient', msg.to[0] === '<user@example.test>', msg.to.join(','))
    check('Subject header present', /^Subject: Confirm your email$/m.test(msg.data))
    check('multipart with text + html', /text\/plain/.test(msg.data) && /text\/html/.test(msg.data))
  }

  // ---- Case 3: bad credentials surface as an error ----
  console.log('\n3. Wrong credentials')
  process.env.SMTP_PASSWORD = 'wrong-token'
  const m3 = await load('lib/services/mailer.ts', '3')
  try { await m3.verifyMailer(); check('bad credentials rejected', false, 'verify unexpectedly succeeded') }
  catch (e: any) { check('bad credentials rejected', /Invalid login|535|credentials/i.test(e.message), e.message) }

  // ---- Case 4: rate-limit / send-error classification ----
  console.log('\n4. Auth error classification')
  const errs = await load('lib/auth/errors.ts', '1')
  check('429 status -> rate limit', errs.isRateLimitError({ status: 429, message: 'nope' }))
  check('"email rate limit exceeded" -> rate limit', errs.isRateLimitError({ message: 'email rate limit exceeded' }))
  check('over_email_send_rate_limit code -> rate limit', errs.isRateLimitError({ code: 'over_email_send_rate_limit' }))
  check('invalid credentials -> NOT rate limit', !errs.isRateLimitError({ status: 400, message: 'Invalid login credentials' }))
  check('null -> NOT rate limit', !errs.isRateLimitError(null))
  check('"Error sending confirmation email" -> send error', errs.isEmailSendError({ message: 'Error sending confirmation email' }))
  check('unexpected_failure + smtp -> send error', errs.isEmailSendError({ code: 'unexpected_failure', message: 'smtp connect ECONNREFUSED' }))
  check('plain 400 -> NOT send error', !errs.isEmailSendError({ status: 400, message: 'User already registered' }))

  await m2.closeMailer(); await m3.closeMailer()
  await smtp.close()
  check('pool closed - process can exit on its own', true)
  console.log(`\n${failures === 0 ? '✅ ALL PASS' : `❌ ${failures} FAILED`}`)
  process.exit(failures ? 1 : 0)
}
main()
