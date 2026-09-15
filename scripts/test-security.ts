/**
 * Security regression test.
 *
 * Locks in the fixes from the production readiness review:
 *   - machine endpoints require CRON_SECRET
 *   - no API route is left unauthenticated by accident
 *   - the routes that leaked configuration are gone
 *
 * Run with: npm run test:security
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

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

function findRoutes(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) findRoutes(full, out)
    else if (entry === 'route.ts') out.push(full)
  }
  return out
}

/**
 * Routes that are public on purpose. Anything not listed here must authenticate.
 * Adding to this list should be a deliberate decision, not a default.
 */
const INTENTIONALLY_PUBLIC = new Set([
  'auth/login/route.ts',
  'auth/logout/route.ts',
  'auth/register/route.ts',
  'auth/forgot-password/route.ts',
  'auth/resend-confirmation/route.ts',
  'health/route.ts',
])

/** Routes authenticated by a shared secret or a signed webhook payload. */
const SECRET_AUTHED = [
  /requireCronAuth/,
  /requireAdminToken/,
  /isCronRequestAuthorized/,
  /CRON_SECRET/,
  /constructEvent/,           // Stripe signature verification
  /validateWebhookSignature/, // Razorpay signature verification
  /createHmac/,               // hand-rolled webhook signature check
  /timingSafeEqual/,
  /TELEGRAM_(WEBHOOK_)?SECRET/,
  /x-telegram-bot-api-secret-token/,
]

/**
 * Every exported handler must be gated, not just POST. Two Telegram routes had
 * a protected POST and a wide-open GET that leaked the bot's webhook config.
 */
function everyHandlerGated(source: string): boolean {
  const handlers = source.match(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g) ?? []
  if (handlers.length <= 1) return true

  const gates =
    (source.match(
      /requireCronAuth\(|requireAdminToken\(|getAuthenticatedUser\(|requireAdmin\(|X-Telegram-Bot-Api-Secret-Token|constructEvent\(|timingSafeEqual\(/g
    ) ?? []).length
  return gates >= handlers.length
}

const SESSION_AUTHED = [/getAuthenticatedUser/, /requireAdmin/, /auth\.getUser\(/]

async function main() {
  console.log('Security verification')
  console.log('=====================')

  // --- cron auth gate ---
  section('Machine endpoint authentication')

  const savedEnv = { ...process.env }
  ;(process.env as Record<string, string>).NODE_ENV = 'production'
  process.env.CRON_SECRET = 's3cret-value'

  const { isCronRequestAuthorized } = await import('../lib/auth/cron')

  const mk = (header?: string, query?: string) =>
    ({
      headers: { get: (k: string) => (k === 'authorization' ? header ?? null : null) },
      nextUrl: { searchParams: { get: (k: string) => (k === 'secret' ? query ?? null : null) } },
    }) as never

  const cases: Array<[string, boolean]> = [
    ['correct bearer token accepted', isCronRequestAuthorized(mk('Bearer s3cret-value'))],
    ['correct query secret accepted', isCronRequestAuthorized(mk(undefined, 's3cret-value'))],
    ['wrong token rejected', !isCronRequestAuthorized(mk('Bearer wrong-value'))],
    ['no credential rejected', !isCronRequestAuthorized(mk())],
    ['prefix of the secret rejected', !isCronRequestAuthorized(mk('Bearer s3cret'))],
    ['empty bearer rejected', !isCronRequestAuthorized(mk('Bearer '))],
  ]
  for (const [name, ok] of cases) (ok ? pass : (m: string) => fail(m))(name)

  delete process.env.CRON_SECRET
  if (!isCronRequestAuthorized(mk()))
    pass('production with no CRON_SECRET refuses rather than running open')
  else fail('PRODUCTION ENDPOINT OPEN WITH NO SECRET SET')

  ;(process.env as Record<string, string>).NODE_ENV = 'development'
  if (isCronRequestAuthorized(mk())) pass('development without a secret still works')
  else fail('development is blocked, which makes local testing impossible')

  process.env = savedEnv

  // --- route inventory ---
  section('Every API route authenticates')

  const apiDir = join(process.cwd(), 'app/api')
  const routes = findRoutes(apiDir)
  const unprotected: string[] = []

  for (const file of routes) {
    const rel = relative(apiDir, file)
    if (INTENTIONALLY_PUBLIC.has(rel)) continue

    const source = readFileSync(file, 'utf8')
    const authed =
      SESSION_AUTHED.some((r) => r.test(source)) || SECRET_AUTHED.some((r) => r.test(source))

    if (!authed) unprotected.push(rel)
    else if (!everyHandlerGated(source)) unprotected.push(`${rel} (a handler is ungated)`)
  }

  console.log(`  ${routes.length} routes, ${INTENTIONALLY_PUBLIC.size} intentionally public`)

  if (unprotected.length === 0) {
    pass('no route is unauthenticated by accident')
  } else {
    fail(`${unprotected.length} route(s) have no authentication`, unprotected.join(', '))
  }

  // --- routes that leaked configuration ---
  section('Removed debug endpoints stay removed')

  const mustNotExist = [
    'app/api/email/test-env/route.ts',
    'app/api/anythingllm/test-endpoints/route.ts',
    'lib/auth/jwt.ts',
  ]
  for (const path of mustNotExist) {
    if (!existsSync(join(process.cwd(), path))) pass(`${path} is gone`)
    else fail(`${path} is back`, 'it exposed configuration without authentication')
  }

  // --- no secret values printed ---
  section('No secret values in logs')

  const offenders: string[] = []
  for (const file of [...routes, ...findRoutesIn('lib')]) {
    const source = readFileSync(file, 'utf8')
    // Printing a secret directly, as opposed to printing whether it is set.
    const bad = source.match(
      /console\.(log|warn|error)\([^)]*(process\.env\.[A-Z_]*(KEY|SECRET|PASSWORD|TOKEN))(?![\s)]*\?)/g
    )
    if (bad) offenders.push(`${relative(process.cwd(), file)}: ${bad[0].slice(0, 60)}`)
  }

  if (offenders.length === 0) pass('no route or service prints a secret value')
  else fail(`${offenders.length} place(s) print a secret`, offenders.join(' | '))

  // --- no hardcoded fallback secrets ---
  section('No hardcoded fallback secrets')

  const defaults: string[] = []
  for (const file of [...routes, ...findRoutesIn('lib')]) {
    const source = readFileSync(file, 'utf8')
    const matches = source.match(
      /process\.env\.[A-Z_]*(SECRET|TOKEN|KEY|PASSWORD)[A-Z_]*\s*(\|\|\s*process\.env\.[A-Z_]+\s*)*\|\|\s*'[^']{4,}'/g
    )
    if (!matches) continue
    for (const m of matches) {
      // Non-secret defaults (hosts, model names) are fine.
      if (/localhost|http:|https:|gpt-|zeptomail|emailapikey|smtp\./.test(m)) continue
      defaults.push(`${relative(process.cwd(), file)}: ${m.slice(0, 70)}`)
    }
  }

  if (defaults.length === 0) {
    pass('no secret falls back to a value committed in the source')
  } else {
    fail(`${defaults.length} hardcoded fallback secret(s)`, defaults.join(' | '))
  }

  section('Result')
  if (failures === 0) console.log('  ✅ Security checks pass.')
  else console.log(`  ❌ ${failures} check(s) failed.`)
  process.exit(failures ? 1 : 0)
}

function findRoutesIn(dir: string): string[] {
  const base = join(process.cwd(), dir)
  if (!existsSync(base)) return []
  const out: string[] = []
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (entry.endsWith('.ts')) out.push(full)
    }
  }
  walk(base)
  return out
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
