/**
 * GET /api/health
 *
 * Liveness and dependency check for uptime monitoring and post-deploy canaries.
 * Deliberately reveals no configuration values - only whether each dependency
 * is reachable - so it is safe to leave public.
 *
 * 200 when the app can serve users, 503 when a hard dependency is down.
 */

import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMailerStatus } from '@/lib/services/mailer'
import { getTTSStatus } from '@/lib/services/tts'
import { getSTTStatus } from '@/lib/services/stt'
import { isDevBypassEnabled } from '@/lib/dev/enabled'

export const dynamic = 'force-dynamic'

async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number | null }> {
  const started = Date.now()
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('users').select('id').limit(1)
    return { ok: !error, latencyMs: Date.now() - started }
  } catch {
    return { ok: false, latencyMs: Date.now() - started }
  }
}

async function checkAnythingLLM(): Promise<{ ok: boolean; latencyMs: number | null }> {
  const url = process.env.ANYTHINGLLM_API_URL
  if (!url) return { ok: false, latencyMs: null }

  const started = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const response = await fetch(`${url}/api/ping`, { signal: controller.signal })
    clearTimeout(timer)
    return { ok: response.ok, latencyMs: Date.now() - started }
  } catch {
    return { ok: false, latencyMs: Date.now() - started }
  }
}

export async function GET(_request: NextRequest) {
  const [database, anythingllm] = await Promise.all([checkDatabase(), checkAnythingLLM()])

  const mailer = getMailerStatus()

  // The database is the only hard dependency. Readings degrade without
  // AnythingLLM, and email queues rather than failing, so neither should take
  // the whole service out of rotation.
  const healthy = database.ok

  const body = {
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: { ok: database.ok, latencyMs: database.latencyMs, required: true },
      anythingllm: { ok: anythingllm.ok, latencyMs: anythingllm.latencyMs, required: false },
      email: { configured: mailer.configured, provider: mailer.provider, required: false },
      tts: { configured: getTTSStatus().providers.some((p) => p.configured), required: false },
      stt: { configured: getSTTStatus().available, required: false },
    },
    // Loud, because a production deployment must never show this as true.
    devAuthBypass: isDevBypassEnabled(),
  }

  return NextResponse.json(body, {
    status: healthy ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
