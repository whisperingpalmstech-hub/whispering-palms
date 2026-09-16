/**
 * Palm photograph analysis — what is ACTUALLY visible in the user's image.
 *
 * Replaces the previous pipeline, which called
 * `generateSimulatedLandmarks()` — a function returning the SAME 21
 * hardcoded proportional points for every image. Every user therefore got
 * identical "measurements" ("rectangular palm", "marriage line: mid
 * position"), and the reading narrated those constants as if they had been
 * read from their hand.
 *
 * Here a vision model describes the photograph, and the result is verified
 * to be image-dependent: two different palms produce different findings, and
 * a non-palm returns palmDetected=false. Nothing is invented — a line that
 * cannot be seen is reported absent rather than filled in.
 *
 * Coordinates are deliberately NOT requested. Testing showed single-shot
 * pixel tracing is unreliable (the life line landed mid-palm instead of
 * around the thumb), and a wrong overlay is worse than none. The visual in
 * lib/services/palm-visual.ts draws anatomically-correct curves whose
 * length/curvature/depth/clarity come from these measured attributes.
 */

import type { PalmAnalysis, AnalysedLine } from './palm-visual'

const ANALYSIS_PROMPT = `You are a careful palmistry image analyst. Describe ONLY what is
physically visible in this photograph of a palm. Do not predict the future.
Do not invent features you cannot see.

Return STRICT JSON, no markdown fence:
{
 "palm_detected": true|false,
 "hand": "left"|"right"|"unclear",
 "image_quality": "good"|"fair"|"poor",
 "palm_shape": "square"|"rectangular"|"conical"|"spatulate"|"mixed",
 "finger_length": "short"|"average"|"long",
 "index_vs_ring": "index_longer"|"ring_longer"|"equal",
 "lines": {
   "heart": {"present":bool,"length":"short|medium|long","depth":"deep|moderate|faint",
             "clarity":"clear|broken|chained|forked","curve":"straight|gently_curved|strongly_curved",
             "branches":0,"observation":"what you actually see"},
   "head":  {"present":bool,"length":"...","depth":"...","clarity":"...","curve":"...",
             "branches":0,"observation":"..."},
   "life":  {"present":bool,"length":"...","depth":"...","clarity":"...","curve":"...",
             "branches":0,"observation":"..."},
   "fate":  {"present":bool,"length":"...","depth":"...","clarity":"...","curve":"...",
             "branches":0,"observation":"..."}
 },
 "mounts": {"venus":"flat|moderate|prominent","jupiter":"...","saturn":"...",
            "apollo":"...","mercury":"...","luna":"..."},
 "special_marks": ["only marks you can genuinely see"],
 "confidence": "high"|"medium"|"low"
}
If no palm is visible set palm_detected=false and leave the rest minimal.`

export interface PalmAnalysisFull extends PalmAnalysis {
  fingerLength?: string
  indexVsRing?: string
  mounts?: Record<string, string>
}

function normaliseLine(raw: any): AnalysedLine {
  if (!raw || raw.present !== true) return { present: false }
  return {
    present: true,
    length: raw.length,
    depth: raw.depth,
    clarity: raw.clarity,
    curve: raw.curve,
    observation: raw.observation,
  }
}

/**
 * Analyse a palm photograph. Returns null when no vision provider is
 * configured, so callers fall back rather than fabricating a reading.
 */
export async function analysePalmPhoto(
  imageUrl: string
): Promise<PalmAnalysisFull | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.PALM_VISION_MODEL || 'google/gemini-2.5-flash-image'

  if (!apiKey) {
    console.warn('[PalmAnalysis] OPENROUTER_API_KEY not set — skipping photo analysis.')
    return null
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: ANALYSIS_PROMPT },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        }],
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      console.error('[PalmAnalysis] Vision call failed:', response.status)
      return null
    }

    const out = await response.json()
    let text: string = out?.choices?.[0]?.message?.content || ''
    text = text.replace(/^```(?:json)?/gm, '').replace(/```$/gm, '').trim()
    const d = JSON.parse(text)

    if (d.palm_detected !== true) {
      console.warn('[PalmAnalysis] No palm detected in the image.')
      return {
        palmDetected: false,
        hand: 'unclear',
        imageQuality: d.image_quality || 'poor',
        lines: {},
      }
    }

    return {
      palmDetected: true,
      hand: d.hand || 'unclear',
      imageQuality: d.image_quality || 'fair',
      palmShape: d.palm_shape,
      fingerLength: d.finger_length,
      indexVsRing: d.index_vs_ring,
      lines: {
        heart: normaliseLine(d.lines?.heart),
        head: normaliseLine(d.lines?.head),
        life: normaliseLine(d.lines?.life),
        fate: normaliseLine(d.lines?.fate),
      },
      mounts: d.mounts,
      specialMarks: Array.isArray(d.special_marks) ? d.special_marks : [],
      confidence: d.confidence || 'medium',
    }
  } catch (error) {
    console.error('[PalmAnalysis] Error analysing palm photo:', error)
    return null
  }
}

/**
 * Render the analysis as text for the reading prompt.
 *
 * Only measured attributes are stated, and absent lines are stated as
 * absent, so the astrologer persona cannot narrate a line the user does not
 * have.
 */
export function formatAnalysisForLLM(a: PalmAnalysisFull, palmType: string): string {
  if (!a.palmDetected) {
    return `${palmType}: no palm could be read from this image.`
  }

  const out: string[] = []
  out.push(`${palmType.toUpperCase()} (${a.hand} hand, image quality: ${a.imageQuality})`)
  if (a.palmShape) out.push(`Palm shape: ${a.palmShape}`)
  if (a.fingerLength) out.push(`Finger length: ${a.fingerLength}`)
  if (a.indexVsRing) out.push(`Index vs ring finger: ${a.indexVsRing}`)

  out.push('Lines actually visible in the photograph:')
  for (const [name, line] of Object.entries(a.lines)) {
    if (!line?.present) {
      out.push(`  - ${name} line: NOT VISIBLE in this photograph. Do not describe it.`)
      continue
    }
    const bits = [
      line.length && `length ${line.length}`,
      line.depth && `depth ${line.depth}`,
      line.clarity && `${line.clarity}`,
      line.curve && `${line.curve.replace('_', ' ')}`,
    ].filter(Boolean).join(', ')
    out.push(`  - ${name} line: ${bits}${line.observation ? ` (${line.observation})` : ''}`)
  }

  if (a.mounts && Object.keys(a.mounts).length) {
    out.push('Mounts: ' + Object.entries(a.mounts)
      .map(([k, v]) => `${k} ${v}`).join(', '))
  }
  if (a.specialMarks?.length) {
    out.push('Marks seen: ' + a.specialMarks.join('; '))
  }
  out.push(`Analysis confidence: ${a.confidence}`)
  out.push('IMPORTANT: base any palm claims ONLY on the attributes above. ' +
    'Never describe a line marked NOT VISIBLE.')
  return out.join('\n')
}
