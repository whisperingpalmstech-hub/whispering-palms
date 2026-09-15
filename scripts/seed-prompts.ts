/**
 * Seed the astrologer persona into the `prompts` table as version 1.
 *
 * Optional. With no rows the app already uses the built-in default from
 * lib/prompts/astrologer-persona.ts; seeding just makes it editable in the
 * admin console. Safe to re-run - it skips if a version already exists.
 *
 *   npm run prompts:seed
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { ASTROLOGER_PERSONA_DEFAULT } from '../lib/prompts/astrologer-persona'

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

  const name = 'astrologer_persona'

  const { data: existing, error: readError } = await supabase
    .from('prompts')
    .select('id, version, is_active')
    .eq('name', name)
    .order('version', { ascending: false })

  if (readError) {
    console.error('Could not read the prompts table.')
    console.error(readError.message)
    console.error('\nHas migrations/002_app_settings_and_prompts.sql been applied?')
    process.exit(1)
  }

  if (existing && existing.length > 0) {
    console.log(`"${name}" already has ${existing.length} version(s). Nothing to do.`)
    console.log(`Latest: version ${existing[0].version}${existing[0].is_active ? ' (active)' : ''}`)
    console.log('\nEdit it in the admin console at /admin instead of re-seeding.')
    return
  }

  const { data, error } = await supabase
    .from('prompts')
    .insert({
      name,
      version: 1,
      content: ASTROLOGER_PERSONA_DEFAULT,
      is_active: true,
      notes: 'Seeded from lib/prompts/astrologer-persona.ts',
    })
    .select('id, version')
    .single()

  if (error) {
    console.error('Could not seed the prompt:', error.message)
    process.exit(1)
  }

  console.log(`Seeded "${name}" version ${data.version} (${ASTROLOGER_PERSONA_DEFAULT.length} chars) and made it active.`)
  console.log('Edit it at /admin.')
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
