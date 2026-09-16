/**
 * Palm line tracing with OpenAI's image models.
 *
 * Returns the user's OWN photograph with the principal lines glowing along
 * their real creases — the artifact people screenshot and share. The photo
 * is preserved and annotated, not replaced by an illustration.
 *
 * Uses /images/edits with gpt-image-2.5-flare, which produced the cleanest
 * result in testing: sharp neon strokes, photo fully intact, and the life
 * line correctly wrapping the thumb ball.
 *
 * KNOWN LIMITATION — the fate line.
 * The model tends to draw a gold fate line even on palms that do not have a
 * continuous one; strengthening the prompt to "omit when in doubt" did not
 * reliably stop it, and made the life line worse. So the fate line is NOT
 * requested here. It is reported in the text analysis
 * (lib/services/palm-analysis.ts), which is honest about absence, and only
 * the three lines the model traces reliably are drawn.
 */

export type TraceModel =
  | 'gpt-image-2.5-flare'
  | 'gpt-image-2.5-sunburst'
  | 'gpt-image-2'
  | 'gpt-image-1.5'

const TRACE_PROMPT = `Annotate this photograph of a hand for a palm reading.

Keep the photograph exactly as it is — same hand, same skin, same lighting.
Do NOT repaint, restyle, cartoonify or replace anything. Only ADD a glowing
line overlay on top.

Study the real creases on this palm and trace them precisely:
  HEART line - soft pink glow. The UPPER long crease crossing the palm just
               below the finger bases.
  HEAD line  - cool blue glow. The MIDDLE long crease crossing the palm,
               below the heart line and roughly parallel to it.
  LIFE line  - green glow. The long curve that WRAPS AROUND THE BASE OF THE
               THUMB, starting between thumb and index finger and arcing
               down and around the thumb ball toward the wrist. It must NOT
               run straight down the centre of the palm.

Draw ONLY these three lines. Do not draw any other line.

Follow each real crease exactly; do not place a line from a template, and do
not draw a line that is not physically present. Each stroke should be smooth,
luminous, about 4px wide with a soft outer glow. Add a gentle dark vignette
at the frame edges. No text, no labels, no arrows, no watermark.`

/**
 * Trace the principal lines onto a palm photograph.
 *
 * @param image  the user's palm photo
 * @returns base64 PNG of the annotated photo
 */
export async function traceLinesWithOpenAI(
  image: Buffer,
  opts: { fileName?: string; contentType?: string; model?: TraceModel; size?: string } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const model = opts.model || (process.env.PALM_TRACE_MODEL as TraceModel) || 'gpt-image-2.5-flare'
  // Portrait by default: a hand is taller than it is wide, and a square
  // canvas crops the fingers or the wrist.
  const size = opts.size || process.env.PALM_TRACE_SIZE || '1024x1536'

  const form = new FormData()
  form.append('model', model)
  form.append('prompt', TRACE_PROMPT)
  form.append('n', '1')
  form.append('size', size)
  form.append(
    'image',
    new Blob([new Uint8Array(image)], { type: opts.contentType || 'image/png' }),
    opts.fileName || 'palm.png'
  )

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300)
    throw new Error(`OpenAI images/edits ${res.status}: ${detail}`)
  }

  const out = await res.json()
  const item = out?.data?.[0]

  if (item?.b64_json) return item.b64_json

  // Some models return a URL instead of inline base64.
  if (item?.url) {
    const img = await fetch(item.url)
    const buf = Buffer.from(await img.arrayBuffer())
    return buf.toString('base64')
  }

  throw new Error('OpenAI returned no image')
}
