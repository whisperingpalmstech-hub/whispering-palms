import { NextRequest, NextResponse } from 'next/server'
import { normalizeCountry } from '@/lib/utils/countries'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import { getAuthenticatedUser } from '@/lib/auth/get-user'

// GET /api/user/profile - Get user profile
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const supabase = await createClient()

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      // Profile might not exist yet, return empty profile
      if (profileError.code === 'PGRST116') {
        return createSuccessResponse({
          profile: null,
          user: user,
        })
      }
      return createErrorResponse('Failed to fetch profile', 500)
    }

    return createSuccessResponse({
      profile: profile,
      user: user,
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}

// PUT /api/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()

    if (!user) {
      return createErrorResponse('Unauthorized', 401)
    }

    const supabase = await createClient()

    const body = await request.json()

    console.log('=== PROFILE UPDATE ===')
    console.log('User ID:', user.id)
    console.log('Request Body:', JSON.stringify(body, null, 2))

    // Validate required fields
    const { date_of_birth, time_of_birth, place_of_birth, birth_timezone, consent_flags, name, gender, voice_gender, voice_speaking_rate } = body

    // Prepare profile data
    const profileData: any = {
      user_id: user.id,
      updated_at: new Date().toISOString(),
    }

    // Note: name is stored in users table, not user_profiles
    if (gender !== undefined) profileData.gender = gender
    if (date_of_birth !== undefined) profileData.date_of_birth = date_of_birth
    if (time_of_birth !== undefined) profileData.time_of_birth = time_of_birth
    if (place_of_birth !== undefined) profileData.place_of_birth = place_of_birth
    if (birth_timezone !== undefined) profileData.birth_timezone = birth_timezone
    if (consent_flags !== undefined) profileData.consent_flags = consent_flags

    // Voice preferences. Clamped and validated here as well as by the database
    // CHECK constraints, so a bad value fails as a 400 rather than a 500.
    if (voice_gender !== undefined) {
      if (voice_gender !== null && !['MALE', 'FEMALE', 'NEUTRAL'].includes(voice_gender)) {
        return createErrorResponse('Voice gender must be MALE, FEMALE or NEUTRAL', 400)
      }
      profileData.voice_gender = voice_gender
    }

    if (voice_speaking_rate !== undefined) {
      if (voice_speaking_rate === null) {
        profileData.voice_speaking_rate = null
      } else {
        const rate = Number(voice_speaking_rate)
        if (!Number.isFinite(rate) || rate < 0.25 || rate > 4) {
          return createErrorResponse('Speaking rate must be between 0.25 and 4', 400)
        }
        profileData.voice_speaking_rate = rate
      }
    }

    console.log('Profile Data to Save:', JSON.stringify(profileData, null, 2))

    // Update or insert profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'user_id',
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile Update Error:', profileError)
      return createErrorResponse('Failed to update profile', 500)
    }

    console.log('Profile Saved Successfully:', profile)
    console.log('======================')

    // Update user basic info if provided
    if (body.name || body.country || body.preferred_language || body.timezone) {
      const userUpdateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (body.name !== undefined) userUpdateData.name = body.name
      // Persist the ISO code. Anything unrecognised is stored as null rather
      // than reintroducing free text that later lookups cannot match.
      if (body.country !== undefined) userUpdateData.country = normalizeCountry(body.country)
      if (body.preferred_language !== undefined) userUpdateData.preferred_language = body.preferred_language
      if (body.timezone !== undefined) userUpdateData.timezone = body.timezone

      await supabase
        .from('users')
        .update(userUpdateData)
        .eq('id', user.id)
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
        console.warn('Context sync failed after profile update')
      }
    } catch (syncError) {
      // Non-blocking - don't fail the request
      console.warn('Error syncing context after profile update:', syncError)
    }

    return createSuccessResponse({
      profile,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}
