import { createClient } from '@supabase/supabase-js'
import { isDevBypassEnabled, warnIfDevBypassActive } from '@/lib/dev/enabled'
import { createDevSupabaseClient } from '@/lib/dev/supabase-stub'

// Admin client with service role key (server-side only)
export function createAdminClient() {
  if (isDevBypassEnabled()) {
    warnIfDevBypassActive()
    return createDevSupabaseClient()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
