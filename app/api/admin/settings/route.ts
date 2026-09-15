/**
 * Runtime configuration.
 *
 * GET  /api/admin/settings  - every key, its value, and where that value came from
 * PUT  /api/admin/settings  - set or clear one key
 *
 * Clearing a key (value: null) reverts it to the environment variable, which is
 * the escape hatch if a bad value is saved.
 */

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import {
  getAllSettings,
  setSetting,
  SETTING_DEFINITIONS,
  type SettingKey,
} from '@/lib/services/config'
import { getTTSStatus } from '@/lib/services/tts'
import { getSTTStatus } from '@/lib/services/stt'
import { getMailerStatus } from '@/lib/services/mailer'

export async function GET(request: NextRequest) {
  const gate = await requireAdmin()
  if ('response' in gate) return gate.response

  try {
    const settings = await getAllSettings()

    return createSuccessResponse({
      settings,
      // Live status, so the console shows what is actually configured rather
      // than only what has been typed into the settings table.
      status: {
        tts: getTTSStatus(),
        stt: getSTTStatus(),
        email: getMailerStatus(),
      },
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Could not load settings',
      500
    )
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireAdmin({ write: true })
  if ('response' in gate) return gate.response

  try {
    const body = await request.json()
    const { key, value } = body as { key?: string; value?: string | null }

    if (!key) {
      return createErrorResponse('A setting key is required', 400)
    }

    if (!(key in SETTING_DEFINITIONS)) {
      return createErrorResponse(
        `"${key}" is not a known setting. Known keys: ${Object.keys(SETTING_DEFINITIONS).join(', ')}`,
        400
      )
    }

    if (value !== null && typeof value !== 'string') {
      return createErrorResponse('Value must be a string, or null to clear it', 400)
    }

    await setSetting(key as SettingKey, value ?? null, gate.admin.userId)

    return createSuccessResponse({
      key,
      value: value ?? null,
      message:
        value === null
          ? `Cleared. "${key}" now uses ${SETTING_DEFINITIONS[key as SettingKey].env}.`
          : `Saved. "${key}" is now "${value}".`,
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Could not save the setting',
      500
    )
  }
}
