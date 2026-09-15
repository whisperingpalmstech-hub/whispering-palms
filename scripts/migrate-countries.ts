/**
 * Country migration driver.
 *
 * Reads every distinct users.country value, resolves it through the same
 * normalizeCountry() the app uses, and reports what will change before it
 * changes anything.
 *
 *   npm run migrate:countries -- --dry-run    report only (default)
 *   npm run migrate:countries -- --apply      write the codes back
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { normalizeCountry, getCountryName } from '../lib/utils/countries'

const apply = process.argv.includes('--apply')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  if (!supabaseUrl || !serviceKey) {
    console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(apply ? 'APPLY MODE - writes enabled\n' : 'DRY RUN - no writes\n')

  const { data: users, error } = await supabase
    .from('users')
    .select('id, country')
    .not('country', 'is', null)

  if (error) {
    console.error('Could not read users:', error.message)
    process.exit(1)
  }

  const rows = users ?? []
  const groups = new Map<string, string[]>()

  for (const u of rows) {
    const raw = (u.country ?? '').trim()
    if (!raw) continue
    if (!groups.has(raw)) groups.set(raw, [])
    groups.get(raw)!.push(u.id)
  }

  const resolved: Array<{ raw: string; code: string; ids: string[] }> = []
  const unmatched: Array<{ raw: string; ids: string[] }> = []
  let alreadyCoded = 0

  for (const [raw, ids] of groups) {
    const code = normalizeCountry(raw)
    if (code === raw && raw.length === 2) {
      alreadyCoded += ids.length
      continue
    }
    if (code) resolved.push({ raw, code, ids })
    else unmatched.push({ raw, ids })
  }

  console.log(`Rows with a country: ${rows.length}`)
  console.log(`Already ISO codes:   ${alreadyCoded}`)
  console.log(`Will be converted:   ${resolved.reduce((n, r) => n + r.ids.length, 0)}`)
  console.log(`Cannot be resolved:  ${unmatched.reduce((n, r) => n + r.ids.length, 0)}\n`)

  if (resolved.length) {
    console.log('Conversions')
    console.log('-----------')
    for (const r of resolved.sort((a, b) => b.ids.length - a.ids.length)) {
      console.log(
        `  ${r.raw.padEnd(28)} -> ${r.code}  ${getCountryName(r.code).padEnd(24)} ${r.ids.length} user(s)`
      )
    }
    console.log()
  }

  if (unmatched.length) {
    console.log('Unresolved - left untouched, add an alias in lib/utils/countries.ts')
    console.log('------------------------------------------------------------------')
    for (const r of unmatched) {
      console.log(`  ${r.raw.padEnd(28)} ${r.ids.length} user(s)`)
    }
    console.log()
  }

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to write these changes.')
    return
  }

  let updated = 0
  for (const r of resolved) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ country: r.code, updated_at: new Date().toISOString() })
      .in('id', r.ids)

    if (updateError) {
      console.error(`  Failed ${r.raw} -> ${r.code}: ${updateError.message}`)
    } else {
      updated += r.ids.length
    }
  }

  console.log(`Updated ${updated} user(s).`)
  if (unmatched.length) {
    console.log(`${unmatched.length} distinct value(s) still need an alias.`)
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
