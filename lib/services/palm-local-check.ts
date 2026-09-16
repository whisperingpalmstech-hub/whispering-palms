/**
 * Local palm plausibility check — no cloud credentials required.
 *
 * WHY THIS EXISTS
 * ---------------
 * The upload route's "validation gate" called Google Vision and, when Vision
 * was not configured, returned `isValid: true` with "Validation skipped".
 * Vision has never been configured on the deployed app (the credentials env
 * var points at a Windows path), so the gate has been failing OPEN: a solid
 * blue square uploads successfully as a palm. Confirmed by test.
 *
 * Cloud Vision stays the preferred check when credentials exist. This module
 * is the floor: a cheap, dependency-free screen using sharp that rejects the
 * obvious junk (flat colours, screenshots, graphics, wildly wrong aspect
 * ratios) so the gate is never wide open.
 *
 * It is deliberately permissive about real photographs — the cost of
 * rejecting a genuine palm is much higher than letting a marginal one
 * through to the matching stage, which flags low-confidence uploads anyway.
 */

import sharp from 'sharp'

export interface LocalPalmCheck {
  isValid: boolean
  confidence: number
  reason: string
  signals: {
    width: number
    height: number
    aspectRatio: number
    skinFraction: number
    colourVariety: number
    edgeDensity: number
    meanSaturation: number
  }
}

/** Fraction of pixels whose colour falls in a broad human-skin gamut. */
function skinFraction(data: Buffer, channels: number): number {
  let skin = 0
  let total = 0
  for (let i = 0; i + channels - 1 < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    total++
    // Broad rule covering pale through deep skin tones, both warm and cool
    // lighting. Intentionally wide: this screens out blue/green/grey images,
    // it is not a skin-tone classifier.
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    if (
      r > 50 && g > 25 && b > 15 &&
      r >= g && g >= b - 12 &&
      mx - mn > 8 &&
      Math.abs(r - g) > 4
    ) {
      skin++
    }
  }
  return total ? skin / total : 0
}

export async function checkLooksLikePalm(buffer: Buffer): Promise<LocalPalmCheck> {
  const image = sharp(buffer, { failOn: 'none' })
  const meta = await image.metadata()
  const width = meta.width || 0
  const height = meta.height || 0

  const fail = (reason: string, confidence = 0): LocalPalmCheck => ({
    isValid: false,
    confidence,
    reason,
    signals: {
      width, height,
      aspectRatio: width && height ? width / height : 0,
      skinFraction: 0, colourVariety: 0, edgeDensity: 0, meanSaturation: 0,
    },
  })

  if (!width || !height) return fail('Could not read the image dimensions.')
  if (width < 200 || height < 200) {
    return fail('That image is too small to read a palm from. Please upload a photo at least 200x200.')
  }

  const aspectRatio = width / height
  if (aspectRatio > 3 || aspectRatio < 0.25) {
    return fail('That does not look like a photo of a hand — the image is an unusual shape.')
  }

  // Downscale for cheap statistics. flatten() so transparent PNGs are
  // measured against a background rather than against undefined alpha.
  const small = sharp(buffer, { failOn: 'none' })
    .flatten({ background: '#ffffff' })
    .resize(160, 160, { fit: 'inside' })
  const { data, info } = await small.raw().toBuffer({ resolveWithObject: true })
  const channels = info.channels

  const skin = skinFraction(data, channels)

  // Colour variety: how many distinct coarse colour buckets are present.
  // A flat fill or simple graphic occupies very few.
  const buckets = new Set<number>()
  let satSum = 0
  let n = 0
  for (let i = 0; i + channels - 1 < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    buckets.add((r >> 4) << 8 | (g >> 4) << 4 | (b >> 4))
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    satSum += mx === 0 ? 0 : (mx - mn) / mx
    n++
  }
  const colourVariety = buckets.size
  const meanSaturation = n ? satSum / n : 0

  // Edge density from a Sobel pass: photographs of hands carry creases,
  // finger boundaries and texture. Flat graphics carry almost none.
  // flatten() matters: the right-hand test image is RGBA with a transparent
  // background, and without flattening the convolution returned all zeros.
  const { data: edges, info: eInfo } = await sharp(buffer, { failOn: 'none' })
    .flatten({ background: '#ffffff' })
    .resize(160, 160, { fit: 'inside' })
    .greyscale()
    .convolve({ width: 3, height: 3, kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1] })
    .raw()
    .toBuffer({ resolveWithObject: true })
  let strong = 0
  for (let i = 0; i < edges.length; i += eInfo.channels) {
    if (edges[i] > 28) strong++
  }
  const edgeDensity = strong / (edges.length / eInfo.channels)

  const signals = {
    width, height, aspectRatio,
    skinFraction: Number(skin.toFixed(3)),
    colourVariety,
    edgeDensity: Number(edgeDensity.toFixed(3)),
    meanSaturation: Number(meanSaturation.toFixed(3)),
  }

  const reject = (reason: string): LocalPalmCheck =>
    ({ isValid: false, confidence: 0.1, reason, signals })

  // A near-flat image: solid colour, gradient, or simple graphic.
  if (colourVariety < 25 || edgeDensity < 0.012) {
    return reject('That image does not look like a photograph of a hand. Please upload a clear photo of your open palm.')
  }

  // Random noise / heavy static. A real photograph of a hand is dominated by
  // a narrow skin gamut, so it never spans this many coarse colour buckets
  // while also being edge-saturated. (4096 buckets exist; a palm photo uses
  // ~100-250, noise uses 800+.)
  if (colourVariety > 600 && edgeDensity > 0.25) {
    return reject('That image looks like noise rather than a hand. Please upload a clear photo of your open palm.')
  }

  // Almost no skin-toned pixels: screenshot, document, object, landscape.
  if (skin < 0.10) {
    return reject('We could not find a hand in that image. Please upload a photo of your open palm, filling most of the frame.')
  }

  // Weak but present signal — allow through, let matching flag it.
  if (skin < 0.22) {
    return {
      isValid: true,
      confidence: 0.45,
      reason: 'Possible palm, low confidence. Matching will verify.',
      signals,
    }
  }

  // Confidence grows with how much of the frame is skin and how much
  // crease/texture detail is present.
  const confidence = Math.min(0.95, 0.5 + skin * 0.45 + Math.min(edgeDensity, 0.2))
  return {
    isValid: true,
    confidence: Number(confidence.toFixed(2)),
    reason: 'Palm detected.',
    signals,
  }
}
