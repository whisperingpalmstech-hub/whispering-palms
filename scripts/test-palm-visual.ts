import { renderPalmSvg, type PalmAnalysis } from '../lib/services/palm-visual'
import { readFileSync, writeFileSync } from 'fs'
import sharp from 'sharp'

// Real analyses produced from the two Wikimedia palm photos.
const raw = JSON.parse(readFileSync('/tmp/palms/semantic_results.json', 'utf8'))

function toAnalysis(d: any): PalmAnalysis {
  return {
    palmDetected: d.palm_detected,
    hand: d.hand,
    imageQuality: d.image_quality,
    palmShape: d.palm_shape,
    lines: {
      heart: d.lines?.heart,
      head: d.lines?.head,
      life: d.lines?.life,
      fate: d.lines?.fate,
    },
    specialMarks: d.special_marks,
    confidence: d.confidence,
  }
}

async function main() {
  const backdrop = 'data:image/png;base64,' +
    readFileSync('/tmp/palms/art_clean.png').toString('base64')

  const cases: [string, string, string][] = [
    ['REAL palm A (left)', '/tmp/palms/visual_A.png', 'Dhruv'],
    ['REAL palm B (right)', '/tmp/palms/visual_B.png', 'Dhruv'],
  ]

  for (const [key, out, name] of cases) {
    const a = toAnalysis(raw[key])
    const svg = renderPalmSvg(a, { backdropDataUri: backdrop, userName: name })
    writeFileSync(out.replace('.png', '.svg'), svg)
    await sharp(Buffer.from(svg)).png().toFile(out)
    const drawn = Object.entries(a.lines)
      .filter(([, l]) => l?.present)
      .map(([n, l]) => `${n}(${l!.length}/${l!.depth}/${l!.curve})`)
    console.log(`${key}\n   -> ${out}`)
    console.log(`   drawn: ${drawn.join(' ')}`)
    const absent = Object.entries(a.lines).filter(([, l]) => !l?.present).map(([n]) => n)
    console.log(`   absent (shown as missing): ${absent.join(', ') || 'none'}`)
  }

  // Prove the two SVGs genuinely differ.
  const A = readFileSync('/tmp/palms/visual_A.svg', 'utf8')
  const B = readFileSync('/tmp/palms/visual_B.svg', 'utf8')
  console.log(`\nSVGs identical? ${A === B ? 'YES (BAD - not data driven)' : 'NO (good - data driven)'}`)
}
main()
