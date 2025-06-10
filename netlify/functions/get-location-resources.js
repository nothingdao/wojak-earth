// netlify/functions/get-location-resources.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { location_id } = event.queryStringParameters || {}

    if (!location_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Location ID is required' })
      }
    }

    // Verify location exists and has mining
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, name, has_mining')
      .eq('id', location_id)
      .single()

    if (locationError || !location) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Location not found' })
      }
    }

    if (!location.has_mining) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          resources: [],
          message: 'No mining available at this location'
        })
      }
    }

    // Get location resources with item details
    const { data: resources, error: resourcesError } = await supabase
      .from('location_resources')
      .select(`
        id,
        item_id,
        spawn_rate,
        max_per_day,
        difficulty,
        items (
          id,
          name,
          rarity,
          category
        )
      `)
      .eq('location_id', location_id)
      .order('difficulty', { ascending: true })

    if (resourcesError) {
      console.error('Error fetching location resources:', resourcesError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch location resources' })
      }
    }

    // Transform the data for the frontend
    const transformedResources = resources?.map(resource => ({
      id: resource.id,
      item_id: resource.item_id,
      itemName: resource.items.name,
      itemRarity: resource.items.rarity,
      spawn_rate: resource.spawn_rate,
      max_per_day: resource.max_per_day,
      difficulty: resource.difficulty
    })) || []

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        resources: transformedResources,
        location: {
          id: location.id,
          name: location.name
        }
      })
    }

  } catch (error) {
    console.error('Error in get-location-resources:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
