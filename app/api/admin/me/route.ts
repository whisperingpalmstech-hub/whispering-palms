/**
 * GET /api/admin/me
 * Whether the current session is an admin, and what it may do.
 * The admin UI calls this to decide whether to render at all.
 */

import { NextRequest } from 'next/server'
import { requireAdmin, canWrite } from '@/lib/auth/admin'
import { createSuccessResponse } from '@/lib/utils/response'

export async function GET(request: NextRequest) {
  const gate = await requireAdmin()
  if ('response' in gate) return gate.response

  return createSuccessResponse({
    email: gate.admin.email,
    role: gate.admin.role,
    canWrite: canWrite(gate.admin.role),
  })
}
