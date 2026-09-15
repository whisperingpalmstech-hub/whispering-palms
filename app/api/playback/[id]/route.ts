import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'

/**
 * GET /api/playback/[id]
 *
 * Returns the reading behind a playback link. The page used to query the
 * `answers` table straight from the browser with the anon key, which Row
 * Level Security now (correctly) denies — every playback link broke. This
 * route checks the session and ownership server-side instead.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return createErrorResponse('Authentication required', 401)
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: answer, error } = await supabase
    .from('answers')
    .select('id, text, email_metadata')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !answer) {
    return NextResponse.json(
      { success: false, error: { message: 'Reading not found' } },
      { status: 404 }
    )
  }

  return createSuccessResponse({
    answer: {
      id: answer.id,
      text: answer.text,
      audioUrl: (answer.email_metadata as any)?.audio_url ?? null,
    },
  })
}
