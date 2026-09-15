/**
 * Admin authorization.
 *
 * An admin is a normal Supabase Auth user whose email also appears in the
 * `admin_users` table. That table has carried a `password_hash` column since the
 * first schema for a separate admin login that was never built; it is ignored
 * here, because a second password system would be a second thing to get wrong.
 *
 * Every admin route must call requireAdmin() and return its error response when
 * one is given. Never infer admin status from anything the client sends.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createErrorResponse } from '@/lib/utils/response'

export type AdminRole = 'super_admin' | 'moderator' | 'support'

export interface AdminUser {
  userId: string
  email: string
  role: AdminRole
}

/** Roles permitted to change configuration and prompts. */
const WRITE_ROLES: readonly AdminRole[] = ['super_admin', 'moderator']

/**
 * Resolve the current request's admin identity, or null.
 *
 * The session is read with the caller's own cookies so it cannot be forged, and
 * the admin lookup uses the service-role client so RLS on admin_users does not
 * have to grant read access to anyone.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return null
  }

  try {
    const admin = createAdminClient()
    const { data, error: lookupError } = await admin
      .from('admin_users')
      .select('email, role')
      // Emails are stored case-sensitively but typed inconsistently.
      .ilike('email', user.email)
      .maybeSingle()

    if (lookupError || !data) {
      return null
    }

    return {
      userId: user.id,
      email: user.email,
      role: (data.role as AdminRole) ?? 'support',
    }
  } catch (lookupError) {
    // Fail closed. An unreadable admin table must not grant access.
    console.error('[admin] Could not verify admin status:', lookupError)
    return null
  }
}

/** True when the role may change configuration. */
export function canWrite(role: AdminRole): boolean {
  return WRITE_ROLES.includes(role)
}

/**
 * Gate for admin routes.
 *
 * Returns either the admin, or the response to return immediately:
 *
 *   const gate = await requireAdmin()
 *   if ('response' in gate) return gate.response
 *   // gate.admin is now trustworthy
 *
 * Pass { write: true } for endpoints that mutate configuration.
 */
export async function requireAdmin(
  options: { write?: boolean } = {}
): Promise<{ admin: AdminUser } | { response: NextResponse }> {
  const admin = await getAdminUser()

  if (!admin) {
    // Same message for "not logged in" and "not an admin" - revealing which
    // would confirm to an attacker that an account exists.
    return { response: createErrorResponse('Not found', 404) }
  }

  if (options.write && !canWrite(admin.role)) {
    return {
      response: createErrorResponse(
        `Your role (${admin.role}) can view settings but not change them.`,
        403
      ),
    }
  }

  return { admin }
}
