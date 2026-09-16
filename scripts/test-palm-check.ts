import { checkLooksLikePalm } from '../lib/services/palm-local-check'
import { readFileSync, writeFileSync } from 'fs'
import sharp from 'sharp'

async function main() {
  // Build negative samples.
  await sharp({ create: { width: 600, height: 600, channels: 3, background: { r: 40, g: 90, b: 160 } } })
    .png().toFile('/tmp/palms/neg_flat_blue.png')
  await sharp({ create: { width: 600, height: 600, channels: 3, background: { r: 235, g: 235, b: 235 } } })
    .png().toFile('/tmp/palms/neg_flat_white.png')
  // Noise - textured but not skin
  const noise = Buffer.alloc(400 * 400 * 3)
  for (let i = 0; i < noise.length; i++) noise[i] = Math.floor(Math.random() * 256)
  await sharp(noise, { raw: { width: 400, height: 400, channels: 3 } })
    .png().toFile('/tmp/palms/neg_noise.png')
  // A "screenshot"-like graphic: few colours, sharp edges
  await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([{
      input: Buffer.from(
        `<svg width="800" height="600">
           <rect x="40" y="40" width="720" height="90" fill="#2b6cb0"/>
           <rect x="40" y="170" width="500" height="40" fill="#4a5568"/>
           <rect x="40" y="230" width="640" height="40" fill="#4a5568"/>
           <rect x="40" y="290" width="380" height="40" fill="#4a5568"/>
         </svg>`), top: 0, left: 0,
    }]).png().toFile('/tmp/palms/neg_ui.png')

  const cases: [string, string, boolean][] = [
    ['REAL right palm (wikimedia)', '/tmp/palms/right.png', true],
    ['REAL left palm  (wikimedia)', '/tmp/palms/left.jpg', true],
    ['flat blue square', '/tmp/palms/neg_flat_blue.png', false],
    ['flat white square', '/tmp/palms/neg_flat_white.png', false],
    ['random noise', '/tmp/palms/neg_noise.png', false],
    ['UI screenshot-like', '/tmp/palms/neg_ui.png', false],
  ]

  let pass = 0, fail = 0
  for (const [label, path, expectValid] of cases) {
    const buf = readFileSync(path)
    const r = await checkLooksLikePalm(buf)
    const ok = r.isValid === expectValid
    ok ? pass++ : fail++
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(30)} valid=${String(r.isValid).padEnd(5)} conf=${r.confidence}`)
    console.log(`        skin=${r.signals.skinFraction} colours=${r.signals.colourVariety} edges=${r.signals.edgeDensity}`)
    if (!r.isValid) console.log(`        -> "${r.reason}"`)
  }
  console.log(`\n${pass} passed, ${fail} failed`)
}
main()
