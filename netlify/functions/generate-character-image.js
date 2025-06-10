// netlify/functions/generate-character-image.js
const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')
const path = require('path')

// Alternative canvas import if the above fails:
// const Canvas = require('canvas')
// const createCanvas = Canvas.createCanvas
// const loadImage = Canvas.loadImage

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

exports.handler = async (event, context) => {
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
      gender,
      layerSelection = 'random',
      specificLayers = null,
      imageSize = 400
    } = JSON.parse(event.body || '{}')

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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Must specify layerSelection=random or provide specificLayers' })
      }
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Image generation failed',
        message: error.message
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

// Check compatibility - from your SandboxView
function areAssetsCompatible(manifest, selectedLayers) {
  const rules = manifest.compatibility_rules || {}

  // Check hair-headwear conflicts (existing global rules)
  const selectedHair = selectedLayers['6-hair']
  const selectedHeadwear = selectedLayers['8-headwear']
  const selectedBase = selectedLayers['1-base']

  console.log('🔍 Checking compatibility:', {
    base: selectedBase,
    hair: selectedHair,
    headwear: selectedHeadwear
  })

  // Check base/hair compatibility FIRST
  if (selectedBase && selectedHair) {
    console.log('🧠 Checking base/hair compatibility...')

    // Check if base has incompatible_hair restrictions
    const baseAsset = findAssetEntry(manifest, '1-base', selectedBase)
    console.log('📦 Base asset found:', baseAsset)

    if (baseAsset && baseAsset.incompatible_hair) {
      console.log('❌ Base has incompatible_hair:', baseAsset.incompatible_hair)
      if (baseAsset.incompatible_hair.includes(selectedHair)) {
        console.log('🚫 BLOCKING: Base incompatible with hair!')
        return false
      }
    }

    // Check if hair has incompatible_base restrictions
    const hairAsset = findAssetEntry(manifest, '6-hair', selectedHair)
    console.log('💇 Hair asset found:', hairAsset)

    if (hairAsset && hairAsset.incompatible_base) {
      console.log('❌ Hair has incompatible_base:', hairAsset.incompatible_base)
      if (hairAsset.incompatible_base.includes(selectedBase)) {
        console.log('🚫 BLOCKING: Hair incompatible with base!')
        return false
      }
    }
  }

  // Rest of compatibility checks...
  if (selectedHair && selectedHeadwear && rules.hair_headwear_conflicts) {
    const hairConflicts = rules.hair_headwear_conflicts[selectedHair]
    if (hairConflicts) {
      if (hairConflicts.blocks && hairConflicts.blocks.includes(selectedHeadwear)) {
        return false
      }
      if (hairConflicts.allows && !hairConflicts.allows.includes(selectedHeadwear)) {
        return false
      }
    }
  }

  if (selectedHair && selectedHeadwear) {
    const headwearAsset = findAssetEntry(manifest, '8-headwear', selectedHeadwear)
    if (headwearAsset && headwearAsset.incompatible_hair) {
      if (headwearAsset.incompatible_hair.includes(selectedHair)) {
        return false
      }
    }

    if (headwearAsset && headwearAsset.requires_hair) {
      if (headwearAsset.requires_hair.length > 0 && !headwearAsset.requires_hair.includes(selectedHair)) {
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

  const selectedOuterwear = selectedLayers['5-outerwear']
  if (selectedOuterwear && selectedHeadwear && rules.outerwear_combinations) {
    const outerwearConflicts = rules.outerwear_combinations[selectedOuterwear]
    if (outerwearConflicts) {
      if (outerwearConflicts.blocks_headwear && outerwearConflicts.blocks_headwear.includes(selectedHeadwear)) {
        return false
      }
      if (outerwearConflicts.allows_headwear && !outerwearConflicts.allows_headwear.includes(selectedHeadwear)) {
        return false
      }
    }
  }

  console.log('✅ Combination allowed')
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

  // First pass: required layers (but check compatibility for hair)
  for (const [layer_type, config] of Object.entries(LAYER_CONFIG)) {
    if (config.required) {
      if (layer_type === '6-hair') {
        // For hair, check compatibility with already selected base
        const compatibleAssets = getCompatibleAssets(manifest, layer_type, selectedLayers, gender)
        if (compatibleAssets.length > 0) {
          selectedLayers[layer_type] = compatibleAssets[Math.floor(Math.random() * compatibleAssets.length)]
        } else {
          // Fallback to any hair if no compatible ones
          const availableAssets = getLayerAssets(manifest, layer_type, gender)
          if (availableAssets.length > 0) {
            selectedLayers[layer_type] = availableAssets[Math.floor(Math.random() * availableAssets.length)]
          }
        }
      } else {
        // For other required layers (like base), just pick randomly
        const availableAssets = getLayerAssets(manifest, layer_type, gender)
        if (availableAssets.length > 0) {
          selectedLayers[layer_type] = availableAssets[Math.floor(Math.random() * availableAssets.length)]
        }
      }
    }
  }

  // Second pass: optional layers (with compatibility checking)
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
