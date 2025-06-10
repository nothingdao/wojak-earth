// netlify/functions/get-all-characters.js - FIXED: Include all characters
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
    const limit = parseInt(event.queryStringParameters?.limit || '100')
    const offset = parseInt(event.queryStringParameters?.offset || '0')
    const statusFilter = event.queryStringParameters?.status // Optional status filter

    // Build query
    let query = supabase
      .from('characters')
      .select(`
        id,
        name,
        gender,
        level,
        energy,
        health,
        coins,
        character_type,
        status,
        current_image_url,
        created_at,
        wallet_address,
        nft_address,
        currentLocation:locations(
          id,
          name,
          biome
        )
      `)

    // FIXED: Only filter by status if specifically requested
    if (statusFilter && ['ACTIVE', 'DEAD', 'INACTIVE'].includes(statusFilter.toUpperCase())) {
      query = query.eq('status', statusFilter.toUpperCase())
    }
    // Otherwise, return ALL characters regardless of status

    const { data: characters, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Get total count for pagination (also include all statuses unless filtered)
    let countQuery = supabase
      .from('characters')
      .select('*', { count: 'exact', head: true })

    if (statusFilter && ['ACTIVE', 'DEAD', 'INACTIVE'].includes(statusFilter.toUpperCase())) {
      countQuery = countQuery.eq('status', statusFilter.toUpperCase())
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Count error:', countError)
    }

    // Transform the data to ensure currentLocation is properly structured
    const transformedCharacters = (characters || []).map(character => ({
      ...character,
      currentLocation: character.currentLocation || {
        id: 'unknown',
        name: 'Unknown Location',
        biome: 'unknown'
      }
    }))

    // Log status breakdown for debugging
    const statusBreakdown = transformedCharacters.reduce((acc, char) => {
      acc[char.status] = (acc[char.status] || 0) + 1
      return acc
    }, {})

    console.log(`📊 Fetched ${transformedCharacters.length} characters:`, statusBreakdown)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        characters: transformedCharacters,
        totalCount: count || transformedCharacters.length,
        statusBreakdown, // Include status breakdown in response
        pagination: {
          limit,
          offset,
          hasMore: transformedCharacters.length === limit
        }
      })
    }

  } catch (error) {
    console.error('Error fetching characters:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch characters',
        message: error.message
      })
    }
  }
}
