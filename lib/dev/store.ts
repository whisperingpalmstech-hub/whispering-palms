/**
 * In-memory database for local development.
 *
 * Holds one row set per table the app touches, seeded with a test user who has
 * completed onboarding, so the dashboard, settings and chat pages have
 * something to render.
 *
 * State lives in a module-level singleton and resets when the dev server
 * restarts. Nothing is persisted, on purpose - this is a scratch environment,
 * not a database.
 */

import { randomUUID } from 'crypto'

export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001'
export const DEV_USER_EMAIL = 'dev@whispering-palms.org'

export interface DevRow {
  [column: string]: unknown
}

type Tables = Record<string, DevRow[]>

const now = () => new Date().toISOString()

function seed(): Tables {
  const today = new Date().toISOString().split('T')[0]
  const resetAt = new Date()
  resetAt.setDate(resetAt.getDate() + 1)
  resetAt.setHours(0, 0, 0, 0)

  return {
    users: [
      {
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        password_hash: null,
        name: 'Dev Tester',
        // Stored as an ISO code, matching the migrated production shape.
        country: 'IN',
        preferred_language: 'en',
        timezone: 'Asia/Kolkata',
        email_verified: true,
        created_at: now(),
        updated_at: now(),
        last_login_at: now(),
      },
    ],

    user_profiles: [
      {
        id: randomUUID(),
        user_id: DEV_USER_ID,
        date_of_birth: '1990-05-15',
        time_of_birth: '14:30:00',
        place_of_birth: 'Bengaluru, Karnataka, India',
        birth_timezone: 'Asia/Kolkata',
        subscription_plan: 'flame',
        voice_gender: null,
        voice_speaking_rate: null,
        astropalm_profile_text: null,
        consent_flags: { images: true, data_usage: true },
        created_at: now(),
        updated_at: now(),
      },
    ],

    daily_quotas: [
      {
        id: randomUUID(),
        user_id: DEV_USER_ID,
        date: today,
        plan_type: 'flame',
        // Matches the Flame plan's quota in lib/services/quota.ts.
        max_questions: 12,
        remaining_questions: 12,
        reset_at: resetAt.toISOString(),
        created_at: now(),
        updated_at: now(),
      },
    ],

    // Present so /admin is reachable without any setup.
    admin_users: [
      {
        id: randomUUID(),
        email: DEV_USER_EMAIL,
        password_hash: 'unused',
        role: 'super_admin',
        permissions: {},
        created_at: now(),
      },
    ],

    subscriptions: [],
    palm_images: [],
    palm_matching_results: [],
    questions: [],
    answers: [],
    transactions: [],
    anythingllm_workspaces: [],
    app_settings: [],
    prompts: [],
    horoscope_cache: [],
    webhook_events: [],
    telegram_subscribers: [],
    telegram_messages_log: [],
    telegram_horoscope_cache: [],
    telegram_nurture_templates: [],
    reading_jobs: [],
  }
}

/**
 * Held on globalThis, not in a module variable.
 *
 * Next.js dev compiles route handlers into separate module registries, so a
 * plain module-level singleton gives every route its own copy of the data - a
 * write in one route is invisible to a read in another. This is the same reason
 * the Prisma client is pinned to globalThis in Next projects.
 */
const GLOBAL_KEY = Symbol.for('whispering-palms.dev-store')

interface GlobalWithStore {
  [GLOBAL_KEY]?: { tables: Tables }
}

const globalStore = globalThis as unknown as GlobalWithStore

if (!globalStore[GLOBAL_KEY]) {
  globalStore[GLOBAL_KEY] = { tables: seed() }
}

const store = globalStore[GLOBAL_KEY]!

/** Rows for a table. Unknown tables start empty rather than throwing, so a new
 *  table in the app does not crash the whole dev environment. */
export function getTable(name: string): DevRow[] {
  if (!store.tables[name]) {
    console.warn(`[dev] Table "${name}" is not seeded - starting it empty.`)
    store.tables[name] = []
  }
  return store.tables[name]
}

export function setTable(name: string, rows: DevRow[]): void {
  store.tables[name] = rows
}

/** Wipe everything back to the seed. Used by the reset endpoint. */
export function resetStore(): void {
  store.tables = seed()
}

/** The signed-in user in dev mode. */
export function getDevUser(): DevRow {
  return (
    getTable('users').find((r) => r.id === DEV_USER_ID) ?? {
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
    }
  )
}

/** Shape matching what Supabase Auth returns from auth.getUser(). */
export function getDevAuthUser() {
  const user = getDevUser()
  return {
    id: DEV_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email as string,
    email_confirmed_at: now(),
    phone: '',
    confirmed_at: now(),
    last_sign_in_at: now(),
    app_metadata: { provider: 'dev-bypass', providers: ['dev-bypass'] },
    user_metadata: { name: user.name, country: user.country },
    identities: [],
    created_at: now(),
    updated_at: now(),
  }
}

export function getDevSession() {
  return {
    access_token: 'dev-bypass-access-token',
    refresh_token: 'dev-bypass-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: getDevAuthUser(),
  }
}

/** Row counts per table, for the dev status endpoint. */
export function getStoreSummary(): Record<string, number> {
  return Object.fromEntries(
    Object.entries(store.tables).map(([name, rows]) => [name, rows.length])
  )
}
