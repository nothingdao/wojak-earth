// netlify/functions/generate-character-image-simple.js
// Simple test version without canvas dependency

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

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
      layerSelection = 'random'
    } = JSON.parse(event.body || '{}')

    if (!gender || !['MALE', 'FEMALE'].includes(gender)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid gender (MALE/FEMALE) is required' })
      }
    }

    console.log(`🎨 Generating ${gender} character with ${layerSelection} selection`)

    // For now, return a simple placeholder and mock layers
    const mockLayers = {
      '1-base': `${gender.toLowerCase()}.png`,
      '4-clothing': 'shirt.png',
      '6-hair': gender === 'MALE' ? 'short-hair.png' : 'long-hair.png',
      'backgrounds': 'default.png'
    }

    // Simple 1x1 transparent PNG as placeholder
    const placeholderImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageBlob: placeholderImage,
        selectedLayers: mockLayers,
        gender,
        message: 'Simple test version - no real image generation yet'
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
