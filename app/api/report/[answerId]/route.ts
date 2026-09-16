import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'

/**
 * GET /api/report/[answerId]
 *
 * The evidence behind one reading: the palm findings it was generated from,
 * plus the reading itself.
 *
 * Reads the analysis STORED WITH THE ANSWER rather than re-running a vision
 * call. Re-analysing would cost ~60s and could return findings that disagree
 * with the reading on screen.
 *
 * Ownership is enforced by RLS (answers are owner-only) and re-checked here.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ answerId: string }> }
) {
  const { answerId } = await params

  const user = await getAuthenticatedUser()
  if (!user) return createErrorResponse('Unauthorized', 401)

  const supabase = await createClient()

  const { data: answer, error } = await supabase
    .from('answers')
    .select('id, text, created_at, user_id, palm_analysis, question_id')
    .eq('id', answerId)
    .single()

  if (error || !answer) return createErrorResponse('Reading not found', 404)
  if (answer.user_id !== user.id) return createErrorResponse('Reading not found', 404)

  const { data: question } = await supabase
    .from('questions')
    .select('text_original, created_at')
    .eq('id', answer.question_id)
    .single()

  // palm_analysis is null for readings generated before it was stored, and
  // for readings where no palm analysis was available. The report says so
  // rather than filling the gap.
  const palms =
    (answer.palm_analysis as { palms?: Array<{ palmType: string; analysis: unknown }> } | null)
      ?.palms ?? []

  return createSuccessResponse({
    answerId: answer.id,
    question: question?.text_original ?? null,
    reading: answer.text,
    createdAt: answer.created_at,
    palms,
    hasAnalysis: palms.length > 0,
  })
}
