import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse } from '@/lib/utils/response'
import { analysePalmPhoto } from '@/lib/services/palm-analysis'
import { renderPalmSvg } from '@/lib/services/palm-visual'

/**
 * GET /api/palm-visual
 *
 * The shareable palm diagram for the signed-in user, as SVG.
 *
 * The three major lines are drawn from the analysis of the user's OWN
 * photograph — length, curvature, depth and clarity all come from what was
 * measured, and a line that is not visible in the photo is shown as missing
 * rather than invented. Two users get visibly different diagrams.
 *
 * `?debug=1` returns the underlying analysis as JSON instead, which is how
 * the "is this actually image-dependent?" check is run.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return createErrorResponse('Unauthorized', 401)
  }

  const supabase = await createClient()

  // Prefer a front-facing palm; that is what the analysis prompt expects.
  const { data: images } = await supabase
    .from('palm_images')
    .select('id, palm_type, storage_path, uploaded_at')
    .eq('user_id', user.id)
    .in('palm_type', ['right_front', 'left_front'])
    .order('uploaded_at', { ascending: false })

  if (!images || images.length === 0) {
    return createErrorResponse('Upload a palm photo first', 404)
  }

  const chosen = images[0]
  const { data: signed } = await supabase.storage
    .from('palm-images')
    .createSignedUrl(chosen.storage_path, 600)

  if (!signed?.signedUrl) {
    return createErrorResponse('Could not read your palm image', 500)
  }

  const analysis = await analysePalmPhoto(signed.signedUrl)

  if (!analysis) {
    return createErrorResponse(
      'Palm analysis is not configured on this server',
      503
    )
  }

  if (request.nextUrl.searchParams.get('debug') === '1') {
    return new Response(JSON.stringify({ palmType: chosen.palm_type, analysis }, null, 1), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  if (!analysis.palmDetected) {
    return createErrorResponse(
      'We could not read a palm from your uploaded photo. Please upload a clearer one.',
      422
    )
  }

  const svg = renderPalmSvg(analysis, {
    userName: user.name || undefined,
    backdropDataUri: await loadBackdrop(),
  })

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      // Per-user content: never cached by an intermediary.
      'Cache-Control': 'private, max-age=300',
    },
  })
}

/**
 * The artwork is inlined as a data URI rather than referenced by URL,
 * because an <image href="/palm-backdrop.png"> inside an SVG is not
 * resolved when the SVG is downloaded, emailed, or rasterised off-page —
 * the share image would arrive with an empty background. Read once and
 * cached in module scope.
 *
 * PNG rather than WebP: librsvg (used by sharp and several email clients to
 * rasterise SVG) does not decode embedded WebP, so a WebP backdrop rendered
 * as a blank background. Verified.
 */
let backdropCache: string | null | undefined

async function loadBackdrop(): Promise<string | undefined> {
  if (backdropCache !== undefined) return backdropCache ?? undefined
  try {
    const { readFile } = await import('fs/promises')
    const { join } = await import('path')
    const buf = await readFile(join(process.cwd(), 'public', 'palm-backdrop.png'))
    backdropCache = `data:image/png;base64,${buf.toString('base64')}`
  } catch (error) {
    console.warn('[palm-visual] Backdrop artwork unavailable; using plain background.', error)
    backdropCache = null
  }
  return backdropCache ?? undefined
}
