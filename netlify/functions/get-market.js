// netlify/functions/get-market.js - FIXED: Added UUID generation
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto' // ADD THIS IMPORT

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

  try {
    const locationId = event.queryStringParameters?.locationId
    const limit = parseInt(event.queryStringParameters?.limit || '20')

    if (!locationId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Location ID is required' })
      }
    }

    // Get location with parent info
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select(`
        *,
        parentLocation:locations!parentLocationId(*)
      `)
      .eq('id', locationId)
      .single()

    if (locationError) throw locationError

    if (!location) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Location not found' })
      }
    }

    if (!location.hasMarket) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No market available',
          message: 'This location does not have a market'
        })
      }
    }

    let allMarketListings = []

    // Get local market listings (items specifically at this location)
    const { data: localListings, error: localError } = await supabase
      .from('market_listings')
      .select(`
        *,
        item:items(*),
        seller:characters(
          id,
          name,
          characterType
        )
      `)
      .eq('locationId', locationId)

    if (localError) throw localError

    // If this is a child location, also get parent location's items (global market)
    let globalListings = []
    if (location.parentLocationId) {
      const { data: globalData, error: globalError } = await supabase
        .from('market_listings')
        .select(`
          *,
          item:items(*),
          seller:characters(
            id,
            name,
            characterType
          )
        `)
        .eq('locationId', location.parentLocationId)

      if (globalError) throw globalError
      globalListings = globalData || []
    }

    // Combine and mark items appropriately
    const combinedListings = [
      ...(localListings || []).map(listing => ({ ...listing, isLocalSpecialty: true })),
      ...globalListings.map(listing => ({ ...listing, isLocalSpecialty: false }))
    ]

    // If no listings exist at all, create some default items
    if (combinedListings.length === 0) {
      console.log(`🏪 No market listings found for ${location.name}, creating system items...`)

      // Get some items to create system listings for
      const { data: availableItems, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .in('category', ['HAT', 'CLOTHING', 'ACCESSORY', 'CONSUMABLE'])
        .limit(6)

      if (itemsError) throw itemsError

      // Create system market listings
      const systemListingsPromises = availableItems.map(async (item) => {
        // Price based on rarity
        let price = 10
        switch (item.rarity) {
          case 'UNCOMMON': price = 25; break
          case 'RARE': price = 50; break
          case 'EPIC': price = 100; break
          case 'LEGENDARY': price = 250; break
        }

        // CRITICAL FIX: Generate unique ID for the listing
        const listingId = randomUUID()

        console.log(`🆕 Creating system listing: ${item.name} for ${price} coins (ID: ${listingId})`)

        const { data: listing, error: listingError } = await supabase
          .from('market_listings')
          .insert({
            id: listingId, // ADD THIS LINE
            locationId: locationId,
            itemId: item.id,
            sellerId: null, // Explicitly set for system items
            price: price,
            quantity: item.category === 'CONSUMABLE' ? 5 : 1,
            isSystemItem: true,
            createdAt: new Date().toISOString(), // Add timestamp for consistency
            updatedAt: new Date().toISOString() // ADD THIS LINE

          })
          .select(`
            *,
            item:items(*),
            seller:characters(
              id,
              name,
              characterType
            )
          `)
          .single()

        if (listingError) {
          console.error(`❌ Failed to create listing for ${item.name}:`, listingError)
          throw listingError
        }

        console.log(`✅ Created system listing: ${item.name}`)
        return listing
      })

      const systemListings = await Promise.all(systemListingsPromises)
      console.log(`🏪 Created ${systemListings.length} system listings for ${location.name}`)

      // Use the newly created listings
      allMarketListings = systemListings.map(listing => ({ ...listing, isLocalSpecialty: true }))
    } else {
      allMarketListings = combinedListings
    }

    // Transform listings for frontend
    const transformedListings = allMarketListings
      .filter(listing => listing.quantity > 0) // Filter out sold-out items
      .sort((a, b) => {
        // Sort: local specialties first, then by creation date
        if (a.isLocalSpecialty && !b.isLocalSpecialty) return -1
        if (!a.isLocalSpecialty && b.isLocalSpecialty) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(0, limit)
      .map(listing => ({
        id: listing.id,
        price: listing.price,
        quantity: listing.quantity,
        isSystemItem: listing.isSystemItem,
        isLocalSpecialty: listing.isLocalSpecialty,
        seller: listing.seller ? {
          id: listing.seller.id,
          name: listing.seller.name,
          characterType: listing.seller.characterType
        } : null,
        item: {
          id: listing.item.id,
          name: listing.item.name,
          description: listing.item.description,
          category: listing.item.category,
          rarity: listing.item.rarity,
          imageUrl: listing.item.imageUrl,
          layerType: listing.item.layerType,
          energyEffect: listing.item.energyEffect,
          healthEffect: listing.item.healthEffect
        },
        createdAt: listing.createdAt
      }))

    console.log(`🏪 Returning ${transformedListings.length} market items for ${location.name}`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        items: transformedListings,
        totalCount: transformedListings.length,
        locationId: locationId,
        locationName: location.name,
        isChildLocation: !!location.parentLocationId,
        parentLocationName: location.parentLocation?.name,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error fetching market items:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to fetch market items',
        details: error.message
      })
    }
  }
}
