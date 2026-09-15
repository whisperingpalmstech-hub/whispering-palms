/**
 * Dev bypass safety test.
 *
 * The bypass disables authentication completely, so the gate is the only thing
 * standing between local convenience and an open production app. This asserts
 * every refusal path.
 *
 * Run with: npm run test:dev-bypass
 */

import { pathToFileURL } from 'url'
import { resolve } from 'path'

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

/** Re-import with a fresh module cache so env changes are re-read. */
let counter = 0
async function gateWith(env: Record<string, string | undefined>) {
  const saved = { ...process.env }
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  const mod = await import(
    pathToFileURL(resolve(process.cwd(), 'lib/dev/enabled.ts')).href + `?v=${counter++}`
  )
  const result = mod.isDevBypassEnabled()
  process.env = saved
  return result
}

const ON = { DEV_AUTH_BYPASS: 'true', NEXT_PUBLIC_DEV_AUTH_BYPASS: 'true' }

async function main() {
  console.log('Dev bypass safety verification')
  console.log('==============================')

  section('Refuses to activate')

  if (!(await gateWith({ ...ON, NODE_ENV: 'production' })))
    pass('NODE_ENV=production overrides the flags')
  else fail('ACTIVATED IN PRODUCTION')

  if (!(await gateWith({ ...ON, NODE_ENV: 'development', VERCEL_ENV: 'production' })))
    pass('VERCEL_ENV=production refuses')
  else fail('ACTIVATED ON A VERCEL PRODUCTION DEPLOY')

  if (!(await gateWith({ ...ON, NODE_ENV: 'development', VERCEL_ENV: 'preview' })))
    pass('VERCEL_ENV=preview refuses — preview URLs are internet-reachable')
  else fail('ACTIVATED ON A VERCEL PREVIEW DEPLOY')

  if (!(await gateWith({ ...ON, NODE_ENV: 'development', VERCEL: '1' })))
    pass('VERCEL=1 refuses')
  else fail('ACTIVATED ON VERCEL')

  section('Requires explicit opt-in')

  if (!(await gateWith({ NODE_ENV: 'development', DEV_AUTH_BYPASS: undefined, NEXT_PUBLIC_DEV_AUTH_BYPASS: undefined })))
    pass('off by default')
  else fail('ACTIVE WITH NO FLAGS SET')

  if (!(await gateWith({ NODE_ENV: 'development', DEV_AUTH_BYPASS: 'true', NEXT_PUBLIC_DEV_AUTH_BYPASS: undefined })))
    pass('server flag alone is not enough')
  else fail('activated with only the server flag')

  if (!(await gateWith({ NODE_ENV: 'development', DEV_AUTH_BYPASS: undefined, NEXT_PUBLIC_DEV_AUTH_BYPASS: 'true' })))
    pass('client flag alone is not enough')
  else fail('activated with only the client flag')

  for (const truthy of ['1', 'yes', 'TRUE', 'True', ' true ']) {
    if (!(await gateWith({ NODE_ENV: 'development', DEV_AUTH_BYPASS: truthy, NEXT_PUBLIC_DEV_AUTH_BYPASS: truthy })))
      pass(`"${truthy}" is not accepted — must be exactly "true"`)
    else fail(`"${truthy}" was accepted`)
  }

  section('Activates only where intended')

  if (await gateWith({ ...ON, NODE_ENV: 'development', VERCEL_ENV: undefined, VERCEL: undefined }))
    pass('local development with both flags set')
  else fail('did not activate locally', 'the bypass would be unusable')

  if (await gateWith({ ...ON, NODE_ENV: 'test', VERCEL_ENV: undefined, VERCEL: undefined }))
    pass('test environment with both flags set')
  else fail('did not activate under NODE_ENV=test')

  section('Store and stub')

  process.env.DEV_AUTH_BYPASS = 'true'
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = 'true'

  const { createDevSupabaseClient } = await import('../lib/dev/supabase-stub')
  const { DEV_USER_ID, resetStore } = await import('../lib/dev/store')
  resetStore()
  const db = createDevSupabaseClient()

  const { data: authUser } = await db.auth.getUser()
  if (authUser?.user?.id === DEV_USER_ID) pass('auth.getUser returns the dev user')
  else fail('auth.getUser did not return the dev user', JSON.stringify(authUser))

  const { data: user, error: userError } = await db
    .from('users')
    .select('id, email, country')
    .eq('id', DEV_USER_ID)
    .single()
  if (!userError && user?.country === 'IN') pass('select().eq().single() reads the seeded user')
  else fail('select failed', JSON.stringify(userError ?? user))

  const { error: missingError } = await db.from('users').select('id').eq('id', 'nope').single()
  if (missingError?.code === 'PGRST116') pass('single() with no rows returns PGRST116')
  else fail('wrong no-rows behaviour', JSON.stringify(missingError))

  const { data: maybe } = await db.from('users').select('id').eq('id', 'nope').maybeSingle()
  if (maybe === null) pass('maybeSingle() with no rows returns null')
  else fail('maybeSingle should return null', JSON.stringify(maybe))

  await db.from('questions').insert({ id: 'q1', user_id: DEV_USER_ID, text_original: 'Will I travel?' })
  const { data: questions } = await db.from('questions').select('*').eq('user_id', DEV_USER_ID)
  if (Array.isArray(questions) && questions.length === 1) pass('insert() then select() round-trips')
  else fail('insert/select round-trip failed', JSON.stringify(questions))

  await db.from('users').update({ name: 'Renamed' }).eq('id', DEV_USER_ID)
  const { data: renamed } = await db.from('users').select('name').eq('id', DEV_USER_ID).single()
  if (renamed?.name === 'Renamed') pass('update().eq() writes')
  else fail('update failed', JSON.stringify(renamed))

  await db.from('user_profiles').upsert({ user_id: DEV_USER_ID, place_of_birth: 'Mysuru' }, { onConflict: 'user_id' })
  const { data: profiles } = await db.from('user_profiles').select('*').eq('user_id', DEV_USER_ID)
  if (profiles?.length === 1 && profiles[0].place_of_birth === 'Mysuru')
    pass('upsert() updates in place rather than duplicating')
  else fail('upsert duplicated or failed', JSON.stringify(profiles))

  await db.from('questions').delete().eq('id', 'q1')
  const { data: afterDelete } = await db.from('questions').select('*')
  if (afterDelete?.length === 0) pass('delete().eq() removes')
  else fail('delete failed', JSON.stringify(afterDelete))

  const { data: admin } = await db.from('admin_users').select('role').ilike('email', 'dev@whispering-palms.org').maybeSingle()
  if (admin?.role === 'super_admin') pass('dev user is seeded as super_admin, so /admin is reachable')
  else fail('admin seed missing', JSON.stringify(admin))

  section('Result')
  if (failures === 0) console.log('  ✅ The bypass is safe and functional.')
  else console.log(`  ❌ ${failures} check(s) failed.`)
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
