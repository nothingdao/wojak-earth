// netlify/functions/generate-character-image.js - RESTORED WORKING VERSION
import { createCanvas, loadImage } from 'canvas'
import fs from 'fs'
import path from 'path'


const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Define proper layer order with probability weights
const LAYER_CONFIG = {
  '1-base': { required: true, probability: 1.0 },
  '2-skin': { required: false, probability: 0.3 },
  '3-undergarments': { required: false, probability: 0.4 },
  '4-clothing': { required: false, probability: 0.4 },
  '5-outerwear': { required: false, probability: 0.6 },
  '6-hair': { required: true, probability: 1.0 },
  '7-face-accessories': { required: false, probability: 0.3 },
  '8-headwear': { required: false, probability: 0.4 },
  '9-misc-accessories': { required: false, probability: 0.2 },
  'backgrounds': { required: true, probability: 1.0 },
  'overlays': { required: false, probability: 0.3 }
}

export const handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const {
      wallet_address,
      gender,
      layerSelection = 'random',
      specificLayers = null,
      imageSize = 400
    } = JSON.parse(event.body || '{}')

    if (!wallet_address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          message: 'Wallet address is required'
        })
      }
    }

    if (!gender || !['MALE', 'FEMALE'].includes(gender)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid gender (MALE/FEMALE) is required' })
      }
    }

    console.log(`🎨 Generating ${gender} character with ${layerSelection} selection`)

    // Load manifest
    const manifest = await loadLayersManifest()

    // Generate or use provided layers
    let selectedLayers
    if (layerSelection === 'random') {
      selectedLayers = await generateRandomLayers(manifest, gender)
    } else if (specificLayers) {
      selectedLayers = specificLayers
    } else {
      selectedLayers = await generateRandomLayers(manifest, gender)
    }

    // Generate image
    const imageBlob = await renderLayersToImage(selectedLayers, imageSize)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageBlob,
        selectedLayers,
        gender
      })
    }

  } catch (error) {
    console.error('Image generation failed:', error)

    // Fallback to simple placeholder if image generation fails
    const fallbackImage = generateFallbackImage(gender || 'MALE')
    const fallbackLayers = generateFallbackLayers(gender || 'MALE')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageBlob: fallbackImage,
        selectedLayers: fallbackLayers,
        gender: gender || 'MALE',
        warning: 'Used fallback image generation'
      })
    }
  }
}

// Load and parse the layers manifest
async function loadLayersManifest() {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'layers', 'manifest.json')
    const manifestData = fs.readFileSync(manifestPath, 'utf8')
    return JSON.parse(manifestData)
  } catch (error) {
    console.error('Failed to load layers manifest:', error)
    return {}
  }
}

// Parse asset entry
function parseAssetEntry(entry) {
  if (typeof entry === 'string') {
    return { file: entry }
  }
  if (typeof entry === 'object' && entry.file) {
    return { file: entry.file, rules: entry }
  }
  return { file: '' }
}

// Get available assets for a layer based on gender and manifest
function getLayerAssets(manifest, layer_type, gender) {
  const layerData = manifest[layer_type]
  if (!layerData || layer_type === 'compatibility_rules') return []

  const genderKey = gender.toLowerCase()
  const availableAssets = []

  // Add gender-specific assets
  if (layerData[genderKey]) {
    for (const entry of layerData[genderKey]) {
      const parsed = parseAssetEntry(entry)
      if (parsed.file) {
        availableAssets.push(parsed.file)
      }
    }
  }

  // Add neutral assets
  if (layerData.neutral) {
    for (const entry of layerData.neutral) {
      const parsed = parseAssetEntry(entry)
      if (parsed.file) {
        availableAssets.push(parsed.file)
      }
    }
  }

  return availableAssets
}

// Helper function to find asset entry with rules
function findAssetEntry(manifest, layer_type, fileName) {
  const layerData = manifest[layer_type]
  if (!layerData || layer_type === 'compatibility_rules') return null

  // Search in all gender categories
  const allEntries = [
    ...(layerData.male || []),
    ...(layerData.female || []),
    ...(layerData.neutral || [])
  ]

  for (const entry of allEntries) {
    if (typeof entry === 'object' && entry.file === fileName) {
      return entry
    }
  }

  return null
}

// Check compatibility
function areAssetsCompatible(manifest, selectedLayers) {
  const rules = manifest.compatibility_rules || {}
  const selectedHair = selectedLayers['6-hair']
  const selectedHeadwear = selectedLayers['8-headwear']
  const selectedBase = selectedLayers['1-base']

  // Check base/hair compatibility
  if (selectedBase && selectedHair) {
    const baseAsset = findAssetEntry(manifest, '1-base', selectedBase)
    if (baseAsset && baseAsset.incompatible_hair) {
      if (baseAsset.incompatible_hair.includes(selectedHair)) {
        return false
      }
    }

    const hairAsset = findAssetEntry(manifest, '6-hair', selectedHair)
    if (hairAsset && hairAsset.incompatible_base) {
      if (hairAsset.incompatible_base.includes(selectedBase)) {
        return false
      }
    }
  }

  // Check hair/headwear compatibility
  if (selectedHair && selectedHeadwear) {
    const headwearAsset = findAssetEntry(manifest, '8-headwear', selectedHeadwear)
    if (headwearAsset && headwearAsset.incompatible_hair) {
      if (headwearAsset.incompatible_hair.includes(selectedHair)) {
        return false
      }
    }

    const hairAsset = findAssetEntry(manifest, '6-hair', selectedHair)
    if (hairAsset && hairAsset.incompatible_headwear) {
      if (hairAsset.incompatible_headwear.includes(selectedHeadwear)) {
        return false
      }
    }
  }

  return true
}

// Get compatible assets
function getCompatibleAssets(manifest, layer_type, selectedLayers, gender) {
  const layerAssets = getLayerAssets(manifest, layer_type, gender)
  const compatibleAssets = []

  for (const asset of layerAssets) {
    const testSelection = { ...selectedLayers, [layer_type]: asset }
    if (areAssetsCompatible(manifest, testSelection)) {
      compatibleAssets.push(asset)
    }
  }

  return compatibleAssets
}

// Generate random layers with compatibility checking
async function generateRandomLayers(manifest, gender) {
  console.log(`🎯 Generating random layers for ${gender}`)

  const selectedLayers = {}

  // First pass: required layers
  for (const [layer_type, config] of Object.entries(LAYER_CONFIG)) {
    if (config.required) {
      if (layer_type === '6-hair') {
        const compatibleAssets = getCompatibleAssets(manifest, layer_type, selectedLayers, gender)
        if (compatibleAssets.length > 0) {
          selectedLayers[layer_type] = compatibleAssets[Math.floor(Math.random() * compatibleAssets.length)]
        } else {
          const availableAssets = getLayerAssets(manifest, layer_type, gender)
          if (availableAssets.length > 0) {
            selectedLayers[layer_type] = availableAssets[Math.floor(Math.random() * availableAssets.length)]
          }
        }
      } else {
        const availableAssets = getLayerAssets(manifest, layer_type, gender)
        if (availableAssets.length > 0) {
          selectedLayers[layer_type] = availableAssets[Math.floor(Math.random() * availableAssets.length)]
        }
      }
    }
  }

  // Second pass: optional layers
  for (const [layer_type, config] of Object.entries(LAYER_CONFIG)) {
    if (!config.required && Math.random() < config.probability) {
      const compatibleAssets = getCompatibleAssets(manifest, layer_type, selectedLayers, gender)
      if (compatibleAssets.length > 0) {
        selectedLayers[layer_type] = compatibleAssets[Math.floor(Math.random() * compatibleAssets.length)]
      }
    }

    if (!selectedLayers[layer_type]) {
      selectedLayers[layer_type] = null
    }
  }

  console.log('🎨 Generated layers:', selectedLayers)
  return selectedLayers
}

// Render layers to image using node-canvas
async function renderLayersToImage(selectedLayers, imageSize = 400) {
  console.log('🖼️ Rendering layers to image...')

  const canvas = createCanvas(imageSize, imageSize)
  const ctx = canvas.getContext('2d')

  // Clear canvas
  ctx.clearRect(0, 0, imageSize, imageSize)

  const layerOrder = Object.keys(LAYER_CONFIG)

  for (const layer_type of layerOrder) {
    const selectedFile = selectedLayers[layer_type]
    if (!selectedFile) continue

    try {
      const imagePath = path.join(process.cwd(), 'public', 'layers', layer_type, selectedFile)

      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        console.warn(`✗ Layer file not found: ${imagePath}`)
        continue
      }

      const img = await loadImage(imagePath)
      ctx.drawImage(img, 0, 0, imageSize, imageSize)
      console.log(`✓ Loaded: ${layer_type}/${selectedFile}`)
    } catch (error) {
      console.warn(`✗ Failed to load layer: ${layer_type}/${selectedFile}`, error)
    }
  }

  // Convert to base64
  const imageDataUrl = canvas.toDataURL('image/png')
  console.log('✅ Image rendering complete')

  return imageDataUrl
}

// Fallback image generation if canvas fails
function generateFallbackImage(gender) {
  const baseColor = gender === 'MALE' ? '4A90E2' : 'E24A90'

  return `data:image/svg+xml;base64,${btoa(`
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#${baseColor}"/>
      <circle cx="200" cy="150" r="60" fill="#FFDBAC"/>
      <text x="200" y="250" font-family="Arial" font-size="18" fill="white" text-anchor="middle">${gender} Wojak</text>
      <text x="200" y="280" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Fallback Image</text>
    </svg>
  `)}`
}

// Fallback layers if manifest fails
function generateFallbackLayers(gender) {
  return {
    '1-base': `base_${gender.toLowerCase()}_1`,
    '6-hair': `hair_${gender.toLowerCase()}_1`,
    'backgrounds': 'bg_default',
    '3-undergarments': null,
    '4-clothing': null,
    '5-outerwear': null,
    '7-face-accessories': null,
    '8-headwear': null,
    '9-misc-accessories': null
  }
}
