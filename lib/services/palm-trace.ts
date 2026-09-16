/**
 * Palm line tracing — the model both READS and DRAWS.
 *
 * WHAT THIS PRODUCES
 * ------------------
 * The user's own photograph, returned with the principal palm lines glowing
 * along their real creases. Not an illustration of a generic hand: the
 * photo is preserved and annotated, which is what palm-reading apps show
 * and what makes the result shareable and personal.
 *
 * WHY IT IS THREE PASSES
 * ----------------------
 * 1. LOCATE  A photo with two hands in frame is the main failure mode —
 *            asked to trace it, the model mixes creases from both hands and
 *            the result is wrong. Verified: the same prompt produced a
 *            correct trace on a single-hand photo and a badly misplaced one
 *            on a two-hand photo. So a vision pass first picks the single
 *            best palm and we crop to it.
 * 2. TRACE   The cropped photo goes to the image model, which returns the
 *            same photo with the lines drawn on.
 * 3. VERIFY  A vision pass checks the lines actually follow the creases,
 *            the photo was not repainted, and the life line wraps the thumb
 *            rather than running down the middle. A bad result is reported
 *            to the caller rather than shown to the user.
 *
 * COST NOTE
 * ---------
 * Image generation is billed per image. This runs on demand (and should be
 * cached per palm image), not on every page view.
 */

export interface PalmLocation {
  handsVisible: number
  which: 'left' | 'right' | 'unclear'
  box: { x: number; y: number; w: number; h: number }
  palmFacingCamera: boolean
  quality: 'good' | 'fair' | 'poor'
  reason?: string
}

export interface TraceVerification {
  photoPreserved: boolean
  linesFollowRealCreases: boolean
  lifeLineWrapsThumb: boolean
  problems: string[]
  verdict: 'good' | 'acceptable' | 'bad'
}

export interface TraceResult {
  imageBase64: string
  mimeType: string
  location: PalmLocation
  verification?: TraceVerification
}

const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions'

function visionModel() {
  return process.env.PALM_VISION_MODEL || 'google/gemini-2.5-flash-image'
}
function imageModel() {
  return process.env.PALM_IMAGE_MODEL || 'google/gemini-3.1-flash-image'
}

const LOCATE_PROMPT = `Look at this photograph. Find the ONE hand whose palm faces the
camera most fully and is best suited to palm reading.

Return STRICT JSON only, no markdown fence:
{"hands_visible": 0,
 "chosen": {"which":"left|right|unclear",
            "box":{"x":0.0,"y":0.0,"w":1.0,"h":1.0}},
 "palm_facing_camera": true,
 "quality": "good|fair|poor",
 "reason": "one short sentence"}

The box is normalised 0..1 of the full image and must tightly contain the
whole hand: wrist at the bottom edge, fingertips at the top edge, thumb
included. If no hand is visible set hands_visible to 0.`

const TRACE_PROMPT = `You are a master palmist annotating a photograph.

Return THIS SAME photograph, edited, with the principal palm lines traced
directly on top of the creases that genuinely exist on this hand.

Study the real hand in the image. Follow each actual crease exactly. Do not
draw a line from memory or from a generic template, and do not draw a line
that is not physically there.

  HEART line - soft pink. The UPPER long crease crossing the palm below the
               finger bases.
  HEAD line  - cool blue. The MIDDLE long crease crossing the palm, below
               the heart line and roughly parallel to it.
  LIFE line  - green. The long curve that WRAPS AROUND THE BASE OF THE THUMB
               (the thumb ball), beginning between thumb and index finger
               and arcing down toward the wrist. It must NOT run straight
               down the middle of the palm.
  FATE line  - gold, VERTICAL up the centre of the palm. Usually absent;
               only draw it if clearly visible.

Each line: a smooth luminous stroke with a soft glow, about 4 px wide.
Keep the original photograph completely intact underneath — do not repaint,
restyle, smooth, cartoonify or replace the hand or the skin. You are adding
an overlay to a photo, nothing else. Add a gentle dark vignette at the
edges. No text, no labels, no arrows, no watermark.`

const VERIFY_PROMPT = `The second image should be the first image with palm lines drawn
on top. Judge it honestly.

STRICT JSON only:
{"photo_preserved": true,
 "lines_follow_real_creases": true,
 "life_line_wraps_thumb": true,
 "problems": [],
 "verdict": "good|acceptable|bad"}

photo_preserved = the original hand is still the original photo, not
repainted or replaced. life_line_wraps_thumb = the green line arcs around
the thumb ball rather than running down the palm's middle.`

function stripFence(text: string): string {
  return text.replace(/^```(?:json)?/gm, '').replace(/```$/gm, '').trim()
}

async function callOpenRouter(body: Record<string, unknown>): Promise<any> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const res = await fetch(OPENROUTER, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300)
    // 402 here means the OpenRouter account has no credit, which is a
    // configuration problem, not a user error — surface it clearly.
    throw new Error(`OpenRouter ${res.status}: ${detail}`)
  }
  return res.json()
}

/** Pass 1 — which hand, and where is it. */
export async function locatePalm(imageDataUri: string): Promise<PalmLocation> {
  const out = await callOpenRouter({
    model: visionModel(),
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: LOCATE_PROMPT },
        { type: 'image_url', image_url: { url: imageDataUri } },
      ],
    }],
    max_tokens: 700,
  })

  const d = JSON.parse(stripFence(out?.choices?.[0]?.message?.content || '{}'))
  return {
    handsVisible: d.hands_visible ?? 0,
    which: d.chosen?.which ?? 'unclear',
    box: d.chosen?.box ?? { x: 0, y: 0, w: 1, h: 1 },
    palmFacingCamera: d.palm_facing_camera ?? false,
    quality: d.quality ?? 'fair',
    reason: d.reason,
  }
}

/** Pass 2 — draw the lines onto the photo. Returns base64 PNG. */
export async function traceLinesOnPhoto(imageDataUri: string): Promise<string> {
  const out = await callOpenRouter({
    model: imageModel(),
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: TRACE_PROMPT },
        { type: 'image_url', image_url: { url: imageDataUri } },
      ],
    }],
    modalities: ['image', 'text'],
    max_tokens: 4000,
  })

  const images = out?.choices?.[0]?.message?.images
  const url: string | undefined = images?.[0]?.image_url?.url
  if (!url) {
    throw new Error('The image model returned no image')
  }
  return url.split(',', 2)[1]
}

/** Pass 3 — is the trace actually any good. */
export async function verifyTrace(
  originalDataUri: string,
  tracedDataUri: string
): Promise<TraceVerification> {
  const out = await callOpenRouter({
    model: visionModel(),
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: VERIFY_PROMPT },
        { type: 'image_url', image_url: { url: originalDataUri } },
        { type: 'image_url', image_url: { url: tracedDataUri } },
      ],
    }],
    max_tokens: 700,
  })

  const d = JSON.parse(stripFence(out?.choices?.[0]?.message?.content || '{}'))
  return {
    photoPreserved: d.photo_preserved ?? false,
    linesFollowRealCreases: d.lines_follow_real_creases ?? false,
    lifeLineWrapsThumb: d.life_line_wraps_thumb ?? false,
    problems: Array.isArray(d.problems) ? d.problems : [],
    verdict: d.verdict ?? 'bad',
  }
}
