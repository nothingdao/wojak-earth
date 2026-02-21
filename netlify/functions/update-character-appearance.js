import supabaseAdmin from '../../src/utils/supabase-admin'

const supabase = supabaseAdmin

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    console.log('🎯 Function called with method:', event.httpMethod)

    const body = JSON.parse(event.body)
    const { character_id, image_blob, wallet_address, description = 'Equipment update' } = body

    console.log('📝 Request data:', {
      character_id,
      wallet_address,
      hasImageBlob: !!image_blob,
      imageBlobLength: image_blob?.length || 0,
      description
    })

    if (!character_id || !image_blob || !wallet_address) {
      console.log('❌ Missing required fields')
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: character_id, image_blob, wallet_address'
        })
      }
    }

    // Verify character ownership
    console.log('🔍 Looking up character:', character_id, 'for wallet:', wallet_address)
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('id, wallet_address, current_version, current_image_url')
      .eq('id', character_id)
      .eq('wallet_address', wallet_address)
      .single()

    if (characterError || !character) {
      console.log('❌ Character lookup failed:', characterError)
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Character not found or access denied', details: characterError?.message })
      }
    }

    console.log('✅ Character found:', character.id, 'current version:', character.current_version)

    // Convert base64 image to buffer
    const base64Data = image_blob.replace(/^data:image\/[a-z]+;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Generate unique filename with version
    const newVersion = (character.current_version || 1) + 1
    const fileName = `player-${character_id}-v${newVersion}.png`

    // Upload new image to Supabase storage
    console.log('📤 Uploading image:', fileName, 'size:', imageBuffer.length, 'bytes')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('players')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to upload image', details: uploadError.message })
      }
    }

    console.log('✅ Image uploaded successfully:', uploadData)

    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('players')
      .getPublicUrl(fileName)

    // Start transaction: Update character and create image record
    const updates = []

    // Update character with new image URL and version
    updates.push(
      supabase
        .from('characters')
        .update({
          current_image_url: publicUrl,
          current_version: newVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', character_id)
    )

    // Create character image record for versioning
    updates.push(
      supabase
        .from('character_images')
        .insert({
          id: `${character_id}-v${newVersion}`,
          character_id: character_id,
          version: newVersion,
          image_url: publicUrl,
          description: description,
          created_at: new Date().toISOString()
        })
    )

    // Execute all updates
    const results = await Promise.all(updates)

    // Check for errors
    for (const result of results) {
      if (result.error) {
        console.error('Database update error:', result.error)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to update character data', details: result.error.message })
        }
      }
    }

    // Optionally: Clean up old image if we want to save storage space
    // This is commented out to preserve version history
    /*
    if (character.current_image_url) {
      try {
        const oldFileName = character.current_image_url.split('/').pop()
        if (oldFileName && oldFileName !== fileName) {
          await supabase.storage
            .from('players')
            .remove([oldFileName])
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup old image:', cleanupError)
        // Don't fail the whole operation for cleanup issues
      }
    }
    */

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        character_id: character_id,
        image_url: publicUrl,
        version: newVersion,
        message: 'Character appearance updated successfully'
      })
    }

  } catch (error) {
    console.error('Function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    }
  }
}
