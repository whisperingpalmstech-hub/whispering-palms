/**
 * Vision API Service
 * Analyzes palm images using Google Cloud Vision API
 */

import { ImageAnnotatorClient } from '@google-cloud/vision'
import { existsSync } from 'fs'
import type { PalmImage } from './user-context'

/**
 * Initialize Google Cloud Vision client
 * Supports service account JSON via:
 * 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (path to JSON file)
 * 2. GOOGLE_SERVICE_ACCOUNT_JSON environment variable (JSON string)
 */
function getVisionClient(): ImageAnnotatorClient | null {
  try {
    // Option 1: Service account JSON file path.
    // Only usable if the file actually exists — GOOGLE_APPLICATION_CREDENTIALS
    // has been seen pointing at a Windows path (C:\secrets\...) that cannot
    // exist on Linux or Vercel. Constructing the client with a missing
    // keyFilename does not throw here; it throws later on first use, which
    // previously surfaced as "validation skipped" and let anything through.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
      if (existsSync(keyPath)) {
        console.log('[Vision API] Using credentials file:', keyPath)
        return new ImageAnnotatorClient({ keyFilename: keyPath })
      }
      console.error(
        `[Vision API] GOOGLE_APPLICATION_CREDENTIALS points at "${keyPath}", which does not exist on this host. ` +
        'Set GOOGLE_SERVICE_ACCOUNT_JSON (inline JSON) instead for serverless deploys.'
      )
    }

    // Option 2: Service account JSON as an inline string (works on Vercel).
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.log('[Vision API] Using credentials from GOOGLE_SERVICE_ACCOUNT_JSON')
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
      return new ImageAnnotatorClient({ credentials })
    }

    // Option 3: Application Default Credentials (GCP metadata server, or a
    // local `gcloud auth application-default login`). Only attempt this when
    // something suggests ADC is actually present, otherwise the client is
    // constructed successfully and fails on first call.
    if (process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT) {
      console.log('[Vision API] Trying application default credentials...')
      try {
        return new ImageAnnotatorClient()
      } catch {
        console.warn('[Vision API] No default credentials available')
        return null
      }
    }

    console.warn('[Vision API] No credentials configured.')
    return null
  } catch (error) {
    console.error('[Vision API] Error initializing client:', error)
    return null
  }
}

/**
 * Format vision API results into palmistry-friendly description
 */
function formatVisionResults(
  labels: any[],
  objects: any[],
  imageProperties: any,
  palmType: string
): string {
  const parts: string[] = []

  parts.push(`Palm Image Analysis (${palmType.replace('_', ' ')}):`)
  parts.push('')

  // Labels (what the API detected)
  if (labels && labels.length > 0) {
    parts.push('Detected Features:')
    const relevantLabels = labels
      .filter((label) => {
        const desc = label.description?.toLowerCase() || ''
        return (
          desc.includes('hand') ||
          desc.includes('palm') ||
          desc.includes('finger') ||
          desc.includes('line') ||
          desc.includes('skin') ||
          desc.includes('texture') ||
          desc.includes('pattern')
        )
      })
      .slice(0, 10) // Top 10 relevant labels

    if (relevantLabels.length > 0) {
      relevantLabels.forEach((label, index) => {
        const confidence = Math.round((label.score || 0) * 100)
        parts.push(`  ${index + 1}. ${label.description} (${confidence}% confidence)`)
      })
    } else {
      // If no specific palm-related labels, include top general labels
      labels.slice(0, 5).forEach((label, index) => {
        const confidence = Math.round((label.score || 0) * 100)
        parts.push(`  ${index + 1}. ${label.description} (${confidence}% confidence)`)
      })
    }
    parts.push('')
  }

  // Object localization (where objects are in the image)
  if (objects && objects.length > 0) {
    parts.push('Detected Objects and Locations:')
    objects.slice(0, 5).forEach((obj, index) => {
      const confidence = Math.round((obj.score || 0) * 100)
      const name = obj.name || 'Unknown object'
      parts.push(`  ${index + 1}. ${name} (${confidence}% confidence)`)
      if (obj.boundingPoly?.normalizedVertices) {
        const vertices = obj.boundingPoly.normalizedVertices
        parts.push(`     Location: ${vertices.length} vertices detected`)
      }
    })
    parts.push('')
  }

  // Image properties (colors, dominant colors, etc.)
  if (imageProperties?.dominantColors?.colors) {
    parts.push('Image Characteristics:')
    const colors = imageProperties.dominantColors.colors.slice(0, 5)
    colors.forEach((color: any, index: number) => {
      const rgb = color.color || {}
      const score = Math.round((color.score || 0) * 100)
      parts.push(
        `  Color ${index + 1}: RGB(${rgb.red || 0}, ${rgb.green || 0}, ${rgb.blue || 0}) - ${score}% prominence`
      )
    })
    parts.push('')
  }

  // Palmistry-specific interpretation
  parts.push('Palmistry Insights:')
  parts.push(
    'Based on the detected features, this palm image shows characteristics that can be analyzed for palmistry purposes. The detected lines, patterns, and hand features provide valuable information for astrological and palmistry guidance.'
  )

  return parts.join('\n')
}

/**
 * Analyze a single palm image using Google Cloud Vision API
 */
export async function analyzePalmImage(
  imageUrl: string,
  palmType: string
): Promise<string> {
  const client = getVisionClient()

  if (!client) {
    console.warn(
      'Google Cloud Vision API not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON environment variable.'
    )
    return `Palm image analysis unavailable. Image type: ${palmType}. Please configure Google Cloud Vision API credentials.`
  }

  try {
    // Download image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const imageBytes = Buffer.from(imageBuffer)

    // Perform all three types of analysis in parallel
    const [labelResult, objectResult, propertiesResult] = await Promise.all([
      client.labelDetection({ image: { content: imageBytes } }),
      client.objectLocalization({ image: { content: imageBytes } }),
      client.imageProperties({ image: { content: imageBytes } }),
    ])

    // Extract results
    const labels = labelResult[0].labelAnnotations || []
    const objects = objectResult[0].localizedObjectAnnotations || []
    const imageProperties = propertiesResult[0].imagePropertiesAnnotation

    // Format results into palmistry-friendly description
    const description = formatVisionResults(labels, objects, imageProperties, palmType)

    return description
  } catch (error) {
    console.error(`Error analyzing palm image (${palmType}):`, error)
    // Return fallback description instead of throwing
    return `Palm image analysis for ${palmType} encountered an issue. Image is available but detailed analysis is pending. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

/**
 * Analyze all palm images in parallel
 * Returns a Map with palmType as key and description as value
 */
export async function analyzeAllPalmImages(
  images: PalmImage[]
): Promise<Map<string, string>> {
  if (images.length === 0) {
    return new Map()
  }

  // Filter images that have signed URLs
  const imagesWithUrls = images.filter((img) => img.signedUrl)

  if (imagesWithUrls.length === 0) {
    console.warn('No palm images with signed URLs available for analysis')
    return new Map()
  }

  // Analyze all images in parallel
  const analysisPromises = imagesWithUrls.map(async (image) => {
    try {
      const description = await analyzePalmImage(image.signedUrl!, image.palmType)
      return { palmType: image.palmType, description }
    } catch (error) {
      // Don't log as error - analyzePalmImage already handles errors gracefully
      console.warn(
        `Vision analysis skipped for ${image.palmType}:`,
        error instanceof Error ? error.message : 'Unknown error'
      )
      return {
        palmType: image.palmType,
        description: `Palm image (${image.palmType}) has been uploaded and is available. Detailed analysis will be available once vision API is configured.`,
      }
    }
  })

  const results = await Promise.all(analysisPromises)

  // Convert to Map
  const descriptionsMap = new Map<string, string>()
  results.forEach((result) => {
    descriptionsMap.set(result.palmType, result.description)
  })

  return descriptionsMap
}

/**
 * Check if vision API is available
 */
export function isVisionAPIAvailable(): boolean {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    // Also check for NEXT_PUBLIC version if used on client (though usually server-side)
    process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_JSON
  )
}

/**
 * Interface for palm validation results
 */
export interface PalmValidationResult {
  isValid: boolean
  confidence: number
  isHand: boolean
  hasDistractors: boolean // e.g., mobile phone, pets
  message: string
  labels: string[]
  landmarks?: Array<{ x: number; y: number; z?: number }>
  handedness?: 'Left' | 'Right' | 'Unknown'
}

/**
 * Validate if an image contains a palm and is not a distractor object
 * This is the "Enterprise Gate" to prevent fake uploads
 */
export async function validateIsPalm(
  imageBuffer: Buffer,
  palmType: string
): Promise<PalmValidationResult> {
  const client = getVisionClient()

  if (!client) {
    console.warn('Google Cloud Vision API not configured for validation. Skipping.')
    // Fallback if not configured: allow but log
    return {
      isValid: true,
      confidence: 0.5,
      isHand: true,
      hasDistractors: false,
      message: 'Validation skipped: Vision API not configured',
      labels: [],
    }
  }

  try {
    console.log('[Vision API] Starting palm validation...')

    // Perform label detection and object localization
    const [labelResult, objectResult] = await Promise.all([
      client.labelDetection({ image: { content: imageBuffer } }),
      client.objectLocalization({ image: { content: imageBuffer } }),
    ])

    const labels = labelResult[0].labelAnnotations || []
    const objects = objectResult[0].localizedObjectAnnotations || []

    const labelDescriptions = labels.map(l => l.description?.toLowerCase() || '')
    const objectNames = objects.map(o => o.name?.toLowerCase() || '')

    // Log detected labels for debugging
    console.log('[Vision API] Detected labels:', labelDescriptions.slice(0, 15).join(', '))
    console.log('[Vision API] Detected objects:', objectNames.join(', '))

    // 1. Check for Hand/Palm presence
    const handKeywords = ['hand', 'palm', 'finger', 'thumb', 'arm', 'gesture', 'wrist']
    const handLabels = labels.filter(l =>
      handKeywords.some(kw => l.description?.toLowerCase().includes(kw))
    )

    const isHandDetected = handLabels.length > 0 ||
      objectNames.some(name => name.includes('hand') || name.includes('person'))

    // Calculate hand confidence
    const handConfidence = handLabels.length > 0
      ? Math.max(...handLabels.map(l => l.score || 0))
      : (isHandDetected ? 0.6 : 0)

    console.log('[Vision API] Hand detected:', isHandDetected, '| Confidence:', handConfidence.toFixed(2))

    // 2. Check for Distractors (Mobile phones, electronics, earbuds, etc.)
    const distractorKeywords = [
      'mobile phone', 'phone', 'smartphone', 'gadget', 'electronics',
      'camera', 'laptop', 'computer', 'earbuds', 'headphones', 'airpods',
      'earbud', 'headphone', 'audio equipment', 'electronic device'
    ]
    const detectedDistractors = labelDescriptions.filter(desc =>
      distractorKeywords.some(kw => desc.includes(kw))
    ) || objectNames.filter(name =>
      distractorKeywords.some(kw => name.includes(kw))
    )

    const hasDistractors = detectedDistractors.length > 0

    if (hasDistractors) {
      console.log('[Vision API] DISTRACTORS DETECTED:', detectedDistractors.join(', '))
    }

    // 3. Final Decision Logic (Enterprise Level - STRICT)
    let isValid = isHandDetected && !hasDistractors
    let message = 'Palm image validated successfully.'

    if (!isHandDetected) {
      isValid = false
      message = 'No hand or palm detected in the image. Please upload a clear photo of your palm.'
      console.log('[Vision API] REJECTED: No hand detected')
    } else if (hasDistractors) {
      isValid = false
      message = 'An electronic device (phone, earbuds, etc.) was detected. Please upload a clear photo of ONLY your palm.'
      console.log('[Vision API] REJECTED: Distractor detected')
    } else {
      console.log('[Vision API] ACCEPTED: Valid palm image')
    }

    // Edge case: if it's "Skin" but not "Hand" with high confidence, allow it
    if (!isValid && !hasDistractors && labelDescriptions.includes('skin')) {
      const skinLabel = labels.find(l => l.description?.toLowerCase() === 'skin')
      if (skinLabel && (skinLabel.score || 0) > 0.7) {
        isValid = true
        message = 'Palm detected via skin texture analysis.'
        console.log('[Vision API] ACCEPTED: Via skin texture with high confidence')
      }
    }

    console.log('[Vision API] Final result:', isValid ? 'VALID' : 'INVALID', '| Message:', message)

    return {
      isValid,
      confidence: handConfidence,
      isHand: isHandDetected,
      hasDistractors,
      message,
      labels: labelDescriptions.slice(0, 10),
    }
  } catch (error) {
    console.error('Error during palm validation:', error)
    return {
      isValid: true, // Fail-safe: allow if API error, but log
      confidence: 0,
      isHand: true,
      hasDistractors: false,
      message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      labels: [],
    }
  }
}

/**
 * Extract palm landmarks for matching
 * Uses MediaPipe service for landmark extraction
 */
export async function extractPalmLandmarks(
  imageBuffer: Buffer
): Promise<{
  landmarks: Array<{ x: number; y: number; z?: number }>
  handedness: 'Left' | 'Right' | 'Unknown'
}> {
  try {
    const { extractLandmarks } = await import('./mediapipe-service')
    return await extractLandmarks(imageBuffer)
  } catch (error) {
    console.error('Error extracting palm landmarks:', error)
    return {
      landmarks: [],
      handedness: 'Unknown'
    }
  }
}

// Re-export types
export type HandLandmark = { x: number; y: number; z?: number }
