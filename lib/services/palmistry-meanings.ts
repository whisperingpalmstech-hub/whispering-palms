/**
 * Traditional palmistry meanings, keyed on what the vision model observed.
 *
 * These are deterministic lookups, NOT model output: the same observation
 * always yields the same words, so a user re-reading their report never sees
 * the meaning change underneath them.
 *
 * Every string is framed as what palmistry traditionally holds, never as a
 * statement of fact about the person. A visible crease is an observation; what
 * it "means" is tradition, and the report must not blur the two.
 */

export type LineKey = 'heart' | 'head' | 'life' | 'fate'

export const LINE_META: Record<
  LineKey,
  { title: string; colour: string; tagline: string }
> = {
  heart: {
    title: 'Heart line',
    colour: '#d9718a',
    tagline: 'Emotional nature, relationships, how you connect',
  },
  head: {
    title: 'Head line',
    colour: '#4a7fa8',
    tagline: 'Thinking style, focus, how you make decisions',
  },
  life: {
    title: 'Life line',
    colour: '#5f8a5f',
    tagline: 'Vitality, resilience, appetite for life',
  },
  fate: {
    title: 'Fate line',
    colour: '#b8860b',
    tagline: 'Career path and sense of direction',
  },
}

/** Meaning for a given line + attribute value. Missing entries are skipped. */
const MEANINGS: Record<string, string> = {
  // Heart
  'heart.length.long': 'A long heart line is traditionally read as a warm, expressive emotional nature with a capacity for deep attachment.',
  'heart.length.medium': 'A medium heart line is traditionally read as emotional balance — open, but self-possessed.',
  'heart.length.short': 'A shorter heart line is traditionally associated with guarding your feelings and showing them selectively.',
  'heart.curve.strongly_curved': 'A strong curve is read as expressive affection — feelings that are shown rather than hidden.',
  'heart.curve.gently_curved': 'A gentle curve is read as balance: affectionate without being ruled by emotion.',
  'heart.curve.straight': 'A straight heart line is traditionally linked with a steady, understated way of loving.',
  'heart.clarity.clear': 'Clarity here is read as emotional consistency.',
  'heart.clarity.broken': 'Breaks are traditionally read as chapters — attachments that shifted rather than faded.',
  'heart.clarity.chained': 'A chained appearance is traditionally linked to a sensitive, deeply-feeling temperament.',

  // Head
  'head.length.long': 'A long head line is associated with thorough, considered thinking and the patience to follow ideas through.',
  'head.length.medium': 'A medium head line is read as practical thinking — enough reflection to decide, not so much to stall.',
  'head.length.short': 'A shorter head line is traditionally linked with quick, instinctive decisions.',
  'head.curve.gently_curved': 'A slight curve blends creative thinking with practical logic.',
  'head.curve.strongly_curved': 'A pronounced curve is traditionally read as an imaginative, associative mind.',
  'head.curve.straight': 'A straight head line is linked with literal, structured, methodical thought.',
  'head.clarity.clear': 'Clarity is read as sustained concentration.',
  'head.clarity.broken': 'Breaks are traditionally read as changes of direction in how you think about things.',

  // Life
  'life.curve.strongly_curved': 'A life line sweeping wide around the thumb is traditionally the mark of strong vitality and enthusiasm for life.',
  'life.curve.gently_curved': 'A moderate curve is read as steady, sustainable energy.',
  'life.curve.straight': 'A life line held close to the thumb is traditionally linked with caution and conserved energy.',
  'life.length.long': 'Length here is read as stamina and the ability to recover from setbacks.',
  'life.depth.deep': 'Depth is traditionally read as robustness and physical resilience.',
  'life.depth.faint': 'A faint life line is traditionally read as sensitivity to overexertion — energy that needs protecting.',

  // Fate
  'fate.depth.deep': 'A well-marked fate line is traditionally read as a strong sense of direction, often settled early.',
  'fate.depth.moderate': 'A moderate fate line is read as a path that is taking shape with effort.',
  'fate.depth.faint': 'A faint fate line suggests a path that is self-directed rather than fixed — direction comes from your own choices.',
  'fate.length.medium': 'A fate line that fades before reaching the top is traditionally read as a course still being shaped.',
  'fate.clarity.broken': 'Breaks are traditionally read as deliberate changes of course rather than setbacks.',
}

export function meaningsFor(
  line: LineKey,
  attrs: { length?: string; depth?: string; clarity?: string; curve?: string }
): string[] {
  const keys = [
    `${line}.length.${attrs.length}`,
    `${line}.curve.${attrs.curve}`,
    `${line}.depth.${attrs.depth}`,
    `${line}.clarity.${attrs.clarity}`,
  ]
  return keys.map((k) => MEANINGS[k]).filter(Boolean) as string[]
}

/** What an absent line means — stated plainly, never invented. */
export const ABSENT_NOTE: Record<LineKey, string> = {
  heart: 'No heart line was clearly visible in your photograph. We do not describe lines we cannot see.',
  head: 'No head line was clearly visible in your photograph. We do not describe lines we cannot see.',
  life: 'No life line was clearly visible in your photograph. A short or faint life line says nothing about lifespan.',
  fate: 'No fate line is visible — which is common, and traditionally read as a self-made path rather than a fixed one.',
}

export const PALM_SHAPE_NOTE: Record<string, string> = {
  rectangular: 'Rectangular palms (longer than wide) are linked in tradition to the "water" and "air" hand types — intuitive, thoughtful, attentive to atmosphere.',
  square: 'Square palms are linked to the "earth" hand — practical, grounded, dependable.',
  conical: 'Conical palms are linked to the "fire" hand — expressive, energetic, quick to act.',
  spatulate: 'Spatulate palms are traditionally associated with restlessness and an inventive, hands-on streak.',
  mixed: 'A mixed palm shape is traditionally read as adaptability — different modes for different situations.',
}

export const MOUNT_LABEL: Record<string, string> = {
  venus: 'Venus — base of the thumb',
  jupiter: 'Jupiter — below the index',
  saturn: 'Saturn — below the middle finger',
  apollo: 'Apollo — below the ring finger',
  mercury: 'Mercury — below the little finger',
  luna: 'Luna — outer edge of the palm',
}

export const MOUNT_QUALITY: Record<string, string> = {
  venus: 'warmth and appetite for life',
  jupiter: 'confidence and ambition',
  saturn: 'discipline and seriousness',
  apollo: 'creativity and expression',
  mercury: 'communication and wit',
  luna: 'imagination and intuition',
}

export const MOUNT_STATE: Record<string, string> = {
  prominent: 'well developed',
  moderate: 'balanced',
  flat: 'understated',
}

export const CONFIDENCE_NOTE: Record<string, string> = {
  high: 'Your photograph was clear, so these findings are reliable.',
  medium:
    'Your photograph was good. Some fine detail — small branches or minor marks — may not have resolved fully. A sharper, evenly-lit photo would raise this.',
  low: 'Photo quality limited what could be read. For a fuller report, re-upload in daylight with your palm flat and fingers slightly apart.',
}
