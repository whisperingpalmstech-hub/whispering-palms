/**
 * Palm reading visual — the shareable hero image for a reading.
 *
 * HONESTY CONTRACT
 * ----------------
 * The three major lines drawn here are NOT decorative. Their shape is
 * DERIVED from the analysis of the user's own photograph:
 *
 *   length   -> how far the curve extends
 *   curve    -> how strongly it bows
 *   depth    -> stroke width and glow
 *   clarity  -> solid / dashed (broken) / wavy (chained) / split end (forked)
 *   present  -> a line absent from the photo is NOT drawn
 *
 * So two users with different palms get visibly different diagrams, and a
 * missing fate line is shown as missing rather than invented. The backdrop
 * is generative art; the geometry is data.
 *
 * Rendered as SVG so it is deterministic, sharp at any size, needs no image
 * model at render time, and can be produced server-side in milliseconds.
 */

export type LineLength = 'short' | 'medium' | 'long' | 'unknown'
export type LineDepth = 'deep' | 'moderate' | 'faint' | 'unknown'
export type LineClarity = 'clear' | 'broken' | 'chained' | 'forked' | 'unknown'
export type LineCurve = 'straight' | 'gently_curved' | 'strongly_curved' | 'unknown'

export interface AnalysedLine {
  present: boolean
  length?: LineLength
  depth?: LineDepth
  clarity?: LineClarity
  curve?: LineCurve
  observation?: string
}

export interface PalmAnalysis {
  palmDetected: boolean
  hand: 'left' | 'right' | 'unclear'
  imageQuality: 'good' | 'fair' | 'poor'
  palmShape?: string
  lines: {
    heart?: AnalysedLine
    head?: AnalysedLine
    life?: AnalysedLine
    fate?: AnalysedLine
  }
  specialMarks?: string[]
  confidence?: 'high' | 'medium' | 'low'
}

const W = 1024
const H = 1280

const PALETTE = {
  heart: '#FF8FA3',
  head: '#8EC5FF',
  life: '#8FE3B0',
  fate: '#FFD98E',
  hand: '#F6E3B8',
  ink: '#F8EFDC',
}

/** How far along its track a line runs, by measured length. */
function extent(length?: LineLength): number {
  switch (length) {
    case 'short': return 0.62
    case 'medium': return 0.82
    case 'long': return 1.0
    default: return 0.82
  }
}

/** How strongly the curve bows, by measured curvature. */
function bow(curve?: LineCurve): number {
  switch (curve) {
    case 'straight': return 0.15
    case 'gently_curved': return 0.55
    case 'strongly_curved': return 1.0
    default: return 0.55
  }
}

function strokeWidth(depth?: LineDepth): number {
  switch (depth) {
    case 'deep': return 7
    case 'moderate': return 5
    case 'faint': return 3
    default: return 5
  }
}

function strokeOpacity(depth?: LineDepth): number {
  switch (depth) {
    case 'deep': return 1
    case 'moderate': return 0.85
    case 'faint': return 0.55
    default: return 0.85
  }
}

function dash(clarity?: LineClarity): string {
  switch (clarity) {
    case 'broken': return '26 14'
    case 'chained': return '8 7'
    default: return ''
  }
}

/** Quadratic path from a->b, bowed perpendicular by `amount`. */
function arc(
  ax: number, ay: number, bx: number, by: number,
  amount: number, t: number
): string {
  const ex = ax + (bx - ax) * t
  const ey = ay + (by - ay) * t
  const mx = (ax + ex) / 2
  const my = (ay + ey) / 2
  const dx = ex - ax
  const dy = ey - ay
  const len = Math.hypot(dx, dy) || 1
  // Perpendicular offset controls the bow.
  const cx = mx - (dy / len) * amount
  const cy = my + (dx / len) * amount
  return `M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`
}

/**
 * Anchor geometry of the backdrop hand, in viewBox units.
 *
 * These were measured off the generated backdrop (a right hand, palm facing
 * the viewer, thumb on the RIGHT of the image). The lines are positioned
 * against these anchors rather than guessed, so the drawn creases land on
 * the correct part of the illustrated palm:
 *
 *   palm spans roughly x 0.36..0.66, y 0.40..0.72 of the square artwork,
 *   which the backdrop is scaled into with a 160px top offset.
 */
const PALM = {
  left: 395,     // ulnar (little-finger) edge of the palm
  right: 660,    // radial edge, where the thumb joins
  top: 545,      // finger bases
  bottom: 915,   // wrist crease
  thumbBase: 660, // x of the thumb ball
}

function linePath(name: 'heart' | 'head' | 'life' | 'fate', l: AnalysedLine): string {
  const t = extent(l.length)
  const b = bow(l.curve)
  switch (name) {
    // Upper transverse crease, just below the finger bases. Runs from the
    // little-finger edge across toward the index.
    case 'heart':
      return arc(PALM.left + 5, PALM.top + 60, PALM.right + 10, PALM.top - 5, 40 * b, t)
    // Middle transverse crease, below the heart line.
    case 'head':
      return arc(PALM.left + 5, PALM.top + 150, PALM.right - 10, PALM.top + 175, 34 * b, t)
    // Arc around the thumb ball, from between thumb and index down to the
    // wrist. Bows toward the thumb side.
    case 'life':
      return arc(PALM.right - 10, PALM.top + 55, PALM.left + 135, PALM.bottom + 5, -105 * b, t)
    // Vertical line up the centre of the palm.
    case 'fate':
      return arc((PALM.left + PALM.right) / 2 - 15, PALM.bottom - 5,
                 (PALM.left + PALM.right) / 2 + 5, PALM.top + 70, 20 * b, t)
  }
}

/** A short fork at the end of a line, when the analysis says forked. */
function forkPath(name: 'heart' | 'head' | 'life' | 'fate', l: AnalysedLine): string {
  if (l.clarity !== 'forked') return ''
  const t = extent(l.length)
  const ends: Record<string, [number, number, number, number]> = {
    heart: [PALM.left + 5, PALM.top + 60, PALM.right + 10, PALM.top - 5],
    head: [PALM.left + 5, PALM.top + 150, PALM.right - 10, PALM.top + 175],
    life: [PALM.right - 10, PALM.top + 55, PALM.left + 135, PALM.bottom + 5],
    fate: [(PALM.left + PALM.right) / 2 - 15, PALM.bottom - 5,
           (PALM.left + PALM.right) / 2 + 5, PALM.top + 70],
  }
  const [ax, ay, bx, by] = ends[name]
  const ex = ax + (bx - ax) * t
  const ey = ay + (by - ay) * t
  const norm = Math.hypot(bx - ax, by - ay) || 1
  const dx = (bx - ax) / norm
  const dy = (by - ay) / norm
  return `M ${ex.toFixed(1)} ${ey.toFixed(1)} l ${(dx * 38 - dy * 22).toFixed(1)} ${(dy * 38 + dx * 22).toFixed(1)}
          M ${ex.toFixed(1)} ${ey.toFixed(1)} l ${(dx * 38 + dy * 22).toFixed(1)} ${(dy * 38 - dx * 22).toFixed(1)}`
}

const LABELS: Record<string, string> = {
  heart: 'Heart',
  head: 'Head',
  life: 'Life',
  fate: 'Fate',
}

/**
 * Build the SVG. `backdropDataUri` is an optional generated artwork used as
 * the background; without it a hand-drawn starfield gradient is used, so the
 * visual never depends on an image model being reachable.
 */
export function renderPalmSvg(
  analysis: PalmAnalysis,
  opts: { backdropDataUri?: string; userName?: string } = {}
): string {
  const order: Array<'life' | 'head' | 'heart' | 'fate'> = ['life', 'head', 'heart', 'fate']

  const drawn = order
    .map((name) => ({ name, line: analysis.lines[name] }))
    .filter((x): x is { name: typeof order[number]; line: AnalysedLine } =>
      !!x.line && x.line.present === true)

  const paths = drawn.map(({ name, line }) => {
    const colour = PALETTE[name]
    const w = strokeWidth(line.depth)
    const o = strokeOpacity(line.depth)
    const d = dash(line.clarity)
    const fork = forkPath(name, line)
    return `
    <g class="line-${name}">
      <path d="${linePath(name, line)}" fill="none" stroke="${colour}"
            stroke-width="${w + 10}" stroke-linecap="round" opacity="0.14"
            filter="url(#soft)" ${d ? `stroke-dasharray="${d}"` : ''}/>
      <path d="${linePath(name, line)}" fill="none" stroke="${colour}"
            stroke-width="${w}" stroke-linecap="round" opacity="${o}"
            ${d ? `stroke-dasharray="${d}"` : ''}/>
      ${fork ? `<path d="${fork}" fill="none" stroke="${colour}" stroke-width="${Math.max(2, w - 2)}"
            stroke-linecap="round" opacity="${o}"/>` : ''}
    </g>`
  }).join('')

  // Legend describes what was measured, including absent lines.
  const legend = order.map((name, i) => {
    const l = analysis.lines[name]
    const y = 1012 + i * 34
    if (!l || !l.present) {
      return `<g opacity="0.4">
        <line x1="110" y1="${y}" x2="150" y2="${y}" stroke="${PALETTE[name]}"
              stroke-width="3" stroke-dasharray="4 6" stroke-linecap="round"/>
        <text x="166" y="${y + 5}" fill="${PALETTE.ink}" font-size="20"
              font-family="Georgia, serif" opacity="0.8">${LABELS[name]} — not visible</text>
      </g>`
    }
    const bits = [l.length, l.depth, l.clarity].filter(Boolean).join(' · ')
    return `<g>
      <line x1="110" y1="${y}" x2="150" y2="${y}" stroke="${PALETTE[name]}"
            stroke-width="${strokeWidth(l.depth)}" stroke-linecap="round"
            ${dash(l.clarity) ? `stroke-dasharray="${dash(l.clarity)}"` : ''}/>
      <text x="166" y="${y + 5}" fill="${PALETTE.ink}" font-size="20"
            font-family="Georgia, serif">${LABELS[name]} — ${bits}</text>
    </g>`
  }).join('')

  // The backdrop is square artwork; place it as a band so the illustrated
  // palm sits where the PALM anchor constants expect it.
  const backdrop = opts.backdropDataUri
    ? `<image href="${opts.backdropDataUri}" x="0" y="160" width="${W}" height="${W}"
              preserveAspectRatio="xMidYMid slice" opacity="0.95"/>`
    : ''

  const title = opts.userName ? `${opts.userName}'s Palm` : 'Your Palm'
  const quality = analysis.imageQuality === 'good' ? '' :
    `<text x="${W / 2}" y="${H - 28}" text-anchor="middle" fill="${PALETTE.ink}"
           font-size="17" font-family="Georgia, serif" opacity="0.55">
       Image quality: ${analysis.imageQuality} — a clearer photo gives a sharper reading
     </text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="46%" r="52%">
      <stop offset="0%" stop-color="#FFC98A" stop-opacity="0.34"/>
      <stop offset="60%" stop-color="#6E5BC8" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#0B1026" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#121a3a"/>
      <stop offset="55%" stop-color="#0d1330"/>
      <stop offset="100%" stop-color="#080b20"/>
    </linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${backdrop}
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Fallback hand outline: drawn ONLY when no backdrop artwork is
       supplied, so the two never compete for the same space. -->
  ${opts.backdropDataUri ? '' : `
  <g fill="none" stroke="${PALETTE.hand}" stroke-width="2.4" opacity="0.5"
     stroke-linecap="round" stroke-linejoin="round">
    <rect x="${PALM.left}" y="${PALM.top - 10}" rx="90"
          width="${PALM.right - PALM.left}" height="${PALM.bottom - PALM.top + 40}"/>
  </g>`}

  ${paths}

  <text x="${W / 2}" y="112" text-anchor="middle" fill="${PALETTE.ink}"
        font-size="44" font-family="Georgia, serif" letter-spacing="3">${title}</text>
  <text x="${W / 2}" y="152" text-anchor="middle" fill="${PALETTE.ink}"
        font-size="19" font-family="Georgia, serif" opacity="0.6" letter-spacing="5">
    WHISPERING PALMS
  </text>

  <text x="110" y="978" fill="${PALETTE.ink}" font-size="21"
        font-family="Georgia, serif" opacity="0.75" letter-spacing="2">
    READ FROM YOUR PHOTOGRAPH
  </text>
  ${legend}
  ${quality}
</svg>`
}
