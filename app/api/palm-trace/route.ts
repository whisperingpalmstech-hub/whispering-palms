import { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse } from '@/lib/utils/response'
import {
  locatePalm,
  traceLinesOnPhoto,
  verifyTrace,
} from '@/lib/services/palm-trace'

export const maxDuration = 120

/**
 * GET /api/palm-trace
 *
 * The user's own palm photograph with their principal lines traced onto the
 * real creases — the shareable artifact of a reading.
 *
 * Pipeline (all model-driven; see lib/services/palm-trace.ts):
 *   locate the best single palm -> crop to it -> trace -> verify.
 *
 * Cropping matters: given a two-hand photo the model blends creases from
 * both and misplaces the lines. Verified on a two-hand sample.
 *
 * `?verify=1` also runs the quality check and returns it in a header, which
 * is how a bad trace is detected rather than silently shipped.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return createErrorResponse('Unauthorized', 401)

  const supabase = await createClient()

  const { data: images } = await supabase
    .from('palm_images')
    .select('id, palm_type, storage_path, uploaded_at')
    .eq('user_id', user.id)
    .in('palm_type', ['right_front', 'left_front'])
    .order('uploaded_at', { ascending: false })

  if (!images?.length) {
    return createErrorResponse('Upload a palm photo first', 404)
  }

  const { data: signed } = await supabase.storage
    .from('palm-images')
    .createSignedUrl(images[0].storage_path, 600)

  if (!signed?.signedUrl) {
    return createErrorResponse('Could not read your palm image', 500)
  }

  try {
    // Fetch the photo once and work from a data URI, so the model never
    // needs to reach a signed URL that may expire mid-pipeline.
    const photoRes = await fetch(signed.signedUrl)
    const buf = Buffer.from(await photoRes.arrayBuffer())
    const mime = photoRes.headers.get('content-type') || 'image/jpeg'
    const originalUri = `data:${mime};base64,${buf.toString('base64')}`

    const location = await locatePalm(originalUri)
    if (!location.handsVisible) {
      return createErrorResponse(
        'We could not find a hand in your photo. Please upload a clear photo of your open palm.',
        422
      )
    }

    // Crop to the chosen palm. sharp is already a dependency.
    const sharp = (await import('sharp')).default
    const meta = await sharp(buf).metadata()
    const W = meta.width || 1
    const H = meta.height || 1
    const pad = 0.04
    const x = Math.max(0, location.box.x - pad)
    const y = Math.max(0, location.box.y - pad)
    const w = Math.min(1 - x, location.box.w + pad * 2)
    const h = Math.min(1 - y, location.box.h + pad * 2)

    const cropped = await sharp(buf)
      .extract({
        left: Math.round(x * W),
        top: Math.round(y * H),
        width: Math.max(1, Math.round(w * W)),
        height: Math.max(1, Math.round(h * H)),
      })
      .jpeg({ quality: 92 })
      .toBuffer()

    const croppedUri = `data:image/jpeg;base64,${cropped.toString('base64')}`

    const tracedB64 = await traceLinesOnPhoto(croppedUri)
    const traced = Buffer.from(tracedB64, 'base64')

    const headers: Record<string, string> = {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=600',
      'X-Palm-Hand': location.which,
      'X-Palm-Quality': location.quality,
    }

    if (request.nextUrl.searchParams.get('verify') === '1') {
      const v = await verifyTrace(
        croppedUri,
        `data:image/png;base64,${tracedB64}`
      )
      headers['X-Palm-Verdict'] = v.verdict
      headers['X-Palm-Problems'] = v.problems.join('; ').slice(0, 300)
    }

    return new Response(new Uint8Array(traced), { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[palm-trace] failed:', message)
    // A billing/config failure must not read as "your photo was bad".
    if (message.includes('402') || message.includes('OPENROUTER_API_KEY')) {
      return createErrorResponse(
        'Palm tracing is not configured on this server',
        503
      )
    }
    return createErrorResponse('Could not trace your palm lines', 500)
  }
}
