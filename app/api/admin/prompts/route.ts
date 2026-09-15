/**
 * Versioned prompts.
 *
 * GET  /api/admin/prompts?name=astrologer_persona  - every version, newest first
 * POST /api/admin/prompts                          - save a new version, or
 *                                                    reactivate an existing one
 *
 * Versions are never edited in place: an old reading must stay traceable to the
 * exact text that produced it.
 */

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response'
import {
  activatePromptVersion,
  createPromptVersion,
  listPromptVersions,
  PROMPT_NAMES,
  type PromptName,
} from '@/lib/services/prompts'

const KNOWN_NAMES: readonly string[] = Object.values(PROMPT_NAMES)

export async function GET(request: NextRequest) {
  const gate = await requireAdmin()
  if ('response' in gate) return gate.response

  const name = request.nextUrl.searchParams.get('name') ?? PROMPT_NAMES.ASTROLOGER_PERSONA

  if (!KNOWN_NAMES.includes(name)) {
    return createErrorResponse(
      `"${name}" is not a known prompt. Known prompts: ${KNOWN_NAMES.join(', ')}`,
      400
    )
  }

  try {
    const versions = await listPromptVersions(name as PromptName)

    return createSuccessResponse({
      name,
      versions,
      active: versions.find((v) => v.is_active) ?? null,
      // No rows means generation is running on the built-in default in code.
      usingBuiltInDefault: versions.length === 0,
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Could not load prompt versions',
      500
    )
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin({ write: true })
  if ('response' in gate) return gate.response

  try {
    const body = await request.json()
    const { name, content, notes, activateId } = body as {
      name?: string
      content?: string
      notes?: string
      activateId?: string
    }

    const promptName = name ?? PROMPT_NAMES.ASTROLOGER_PERSONA

    if (!KNOWN_NAMES.includes(promptName)) {
      return createErrorResponse(
        `"${promptName}" is not a known prompt. Known prompts: ${KNOWN_NAMES.join(', ')}`,
        400
      )
    }

    // Rollback: make an existing version active again.
    if (activateId) {
      await activatePromptVersion(promptName as PromptName, activateId)
      return createSuccessResponse({
        message: 'That version is now active. New readings will use it.',
      })
    }

    if (!content?.trim()) {
      return createErrorResponse('Prompt content is required', 400)
    }

    const version = await createPromptVersion(promptName as PromptName, content, {
      notes,
      createdBy: gate.admin.userId,
    })

    return createSuccessResponse({
      version,
      message: `Saved as version ${version.version} and made active.`,
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Could not save the prompt',
      500
    )
  }
}
