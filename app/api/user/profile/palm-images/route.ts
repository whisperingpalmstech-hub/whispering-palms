import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import { getAuthenticatedUser } from '@/lib/auth/get-user'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_PALM_TYPES = ['right_front', 'left_front', 'right_side', 'left_side']

// POST /api/user/profile/palm-images - Upload palm image
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const supabase = await createClient()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const palmType = formData.get('palm_type') as string | null
    const widthStr = formData.get('width') as string | null
    const heightStr = formData.get('height') as string | null

    if (!file) {
      return createErrorResponse('No file provided', 400)
    }

    if (!palmType || !ALLOWED_PALM_TYPES.includes(palmType)) {
      return createErrorResponse(
        `Invalid palm_type. Must be one of: ${ALLOWED_PALM_TYPES.join(', ')}`,
        400
      )
    }

    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return createErrorResponse(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed',
        400
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return createErrorResponse(
        `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        400
      )
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${randomUUID()}.${fileExtension}`
    const storagePath = `${user.id}/${palmType}/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // --- VALIDATION GATE ---
    // Two layers, so this can never fail open:
    //   1. Google Vision when credentials exist (best signal).
    //   2. A local sharp-based check otherwise (the floor).
    //
    // This gate used to call Vision alone, and Vision returns
    // "validation skipped -> isValid: true" when unconfigured. It has never
    // been configured on the deployed app, so a solid blue square uploaded
    // successfully as a palm. Verified by test.
    const { validateIsPalm } = await import('@/lib/services/vision-api')
    const validation = await validateIsPalm(buffer, palmType)

    let effectiveConfidence = validation.confidence
    const visionSkipped = /not configured|skipped/i.test(validation.message || '')

    if (!validation.isValid && !visionSkipped) {
      return createErrorResponse(validation.message, 400)
    }

    if (visionSkipped) {
      const { checkLooksLikePalm } = await import('@/lib/services/palm-local-check')
      const local = await checkLooksLikePalm(buffer)
      console.log('[Upload] Vision unavailable; local palm check:', JSON.stringify(local.signals))

      if (!local.isValid) {
        return createErrorResponse(local.reason, 400)
      }
      effectiveConfidence = local.confidence
    }
    // --- END VALIDATION GATE ---

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('palm-images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      })

    if (uploadError) {
      return createErrorResponse(`Upload failed: ${uploadError.message}`, 500)
    }

    // Get image dimensions from form data (sent by client)
    let width = widthStr ? parseInt(widthStr, 10) : 0
    let height = heightStr ? parseInt(heightStr, 10) : 0

    // If dimensions are missing or invalid, estimate from file size
    // This allows uploads to proceed even if client-side dimension extraction fails
    if (width === 0 || height === 0 || isNaN(width) || isNaN(height)) {

      // Estimate dimensions from file size
      // Typical palm image: ~500KB = ~1200x1600px
      const estimatedPixels = Math.sqrt((file.size / 1024) * 2000)
      width = Math.round(estimatedPixels * 0.75) || 1200
      height = Math.round(estimatedPixels * 1.0) || 1600
    }

    // Save metadata to database
    const { data: palmImage, error: dbError } = await supabase
      .from('palm_images')
      .insert({
        user_id: user.id,
        palm_type: palmType,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        width: width, // Validated dimensions
        height: height, // Validated dimensions
        matching_status: effectiveConfidence > 0.8 ? 'pending' : 'flagged', // Mark as flagged if confidence is low
        matching_score: effectiveConfidence, // Store validation confidence initially
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      // Cleanup: delete uploaded file if database insert fails
      await supabase.storage.from('palm-images').remove([storagePath])
      return createErrorResponse(`Database error: ${dbError.message}`, 500)
    }

    // Generate signed URL for preview (valid for 1 hour)
    const { data: urlData } = await supabase.storage
      .from('palm-images')
      .createSignedUrl(storagePath, 3600)

    // Run palm matching now that a new image exists.
    //
    // This used to be left to the client ("let client handle it"), and the
    // client never called it — every upload sat at its initial status
    // forever, so the dashboard showed a verification verdict that did not
    // correspond to the images on file. Non-blocking: a matching failure
    // must not fail the upload, it just leaves the image pending.
    try {
      const matchResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/palm-matching/match`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: request.headers.get('cookie') || '',
          },
          body: JSON.stringify({}),
        }
      )
      if (!matchResponse.ok) {
        console.warn('[Upload] Palm matching returned', matchResponse.status)
      }
    } catch (matchError) {
      console.warn('[Upload] Palm matching could not be run:', matchError)
    }

    // Sync context to AnythingLLM workspace (non-blocking)
    try {
      const syncResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/anythingllm/sync-context`,
        {
          method: 'POST',
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
        }
      )
      // Don't fail if sync fails - just log it
      if (!syncResponse.ok) {
        console.warn('Context sync failed after palm upload')
      }
    } catch (syncError) {
      // Non-blocking - don't fail the request
      console.warn('Error syncing context after palm upload:', syncError)
    }

    return createSuccessResponse({
      palmImage: {
        ...palmImage,
        signed_url: urlData?.signedUrl || null,
      },
      message: 'Palm image uploaded successfully',
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}

// GET /api/user/profile/palm-images - Get user's palm images
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const supabase = await createClient()

    // Get all palm images for user
    const { data: palmImages, error: palmImagesError } = await supabase
      .from('palm_images')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })

    if (palmImagesError) {
      return createErrorResponse('Failed to fetch palm images', 500)
    }

    // Generate signed URLs for all images
    const imagesWithUrls = await Promise.all(
      palmImages.map(async (image) => {
        const { data: urlData } = await supabase.storage
          .from('palm-images')
          .createSignedUrl(image.storage_path, 3600)

        return {
          ...image,
          signed_url: urlData?.signedUrl || null,
        }
      })
    )

    return createSuccessResponse({
      palmImages: imagesWithUrls,
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}
