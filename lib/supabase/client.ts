import { createBrowserClient } from '@supabase/ssr'
import { isDevBypassEnabledClient } from '@/lib/dev/enabled'
import { createDevSupabaseClient } from '@/lib/dev/supabase-stub'

export function createClient() {
  // Mirrors the server gate. Nothing security-relevant is decided here - every
  // API route re-checks server-side with isDevBypassEnabled().
  if (isDevBypassEnabledClient()) {
    return createDevSupabaseClient()
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
