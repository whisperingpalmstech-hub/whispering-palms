import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isDevBypassEnabled, warnIfDevBypassActive } from '@/lib/dev/enabled'
import { createDevSupabaseClient } from '@/lib/dev/supabase-stub'

export async function createClient() {
  // Local development with no Supabase project. See lib/dev/enabled.ts for the
  // gates - this cannot activate in production or on any Vercel deployment.
  if (isDevBypassEnabled()) {
    warnIfDevBypassActive()
    return createDevSupabaseClient()
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
