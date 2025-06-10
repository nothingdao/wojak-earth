// lib/admin/adminTools.ts - CORRECTED for your actual schema

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

// Generate UUID function (since crypto.randomUUID might not be available in browser)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ===== WORLD OVERVIEW FUNCTIONS =====

export async function getWorldOverview() {
  try {
    const [locationsResult, itemsResult, charactersResult, resourcesResult] =
      await Promise.all([
        supabase
          .from('locations')
          .select('id, name, biome, difficulty, player_count, status'),
        supabase.from('items').select('id, name, category, rarity'),
        supabase
          .from('characters')
          .select(
            'id, name, currentlocation_id, level, energy, health, status'
          ),
        supabase
          .from('location_resources')
          .select('id, location_id, item_id, spawn_rate, difficulty'),
      ])

    const locations = locationsResult.data || []
    const items = itemsResult.data || []
    const characters = charactersResult.data || []
    const resources = resourcesResult.data || []

    // Calculate stats
    const activeCharacters = characters.filter((c) => c.status === 'ACTIVE')
    const onlineCharacters = characters.filter((c) => c.energy > 50) // Rough estimate
    const avgLevel =
      characters.length > 0
        ? Math.round(
            (characters.reduce((sum, c) => sum + c.level, 0) /
              characters.length) *
              10
          ) / 10
        : 0

    // Group data for insights
    const locationsByBiome = groupBy(locations, 'biome')
    const itemsByCategory = groupBy(items, 'category')
    const itemsByRarity = groupBy(items, 'rarity')
    const charactersByLocation = groupBy(characters, 'currentlocation_id')

    return {
      totals: {
        locations: locations.length,
        items: items.length,
        characters: characters.length,
        resources: resources.length,
        activeCharacters: activeCharacters.length,
        onlineCharacters: onlineCharacters.length,
        avgLevel,
      },
      breakdown: {
        locationsByBiome,
        itemsByCategory,
        itemsByRarity,
        charactersByLocation,
      },
      raw: {
        locations,
        items,
        characters,
        resources,
      },
    }
  } catch (error) {
    console.error('Error fetching world overview:', error)
    throw error
  }
}

export async function getRecentActivity(limit = 20) {
  // Get recent characters as activity (since you don't have activity_log table)
  try {
    const { data: characters } = await supabase
      .from('characters')
      .select(
        'id, name, created_at, currentlocation_id, location:locations(name)'
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    return (characters || []).map((char, index) => ({
      id: char.id + '_activity',
      type: 'character' as const,
      action: 'Character created',
      target: `${char.name} in ${char.location?.name || 'Unknown'}`,
      timestamp: new Date(char.created_at).toLocaleString(),
    }))
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

// ===== CHARACTER MANAGEMENT =====

export async function getCharacterDetails(character_id: string) {
  const { data, error } = await supabase
    .from('characters')
    .select(
      `
      *,
      location:locations(name, biome, difficulty)
    `
    )
    .eq('id', character_id)
    .single()

  if (error) throw error
  return data
}

export async function updateCharacterStats(
  character_id: string,
  updates: {
    health?: number
    energy?: number
    coins?: number
    level?: number
    status?: string
  }
) {
  const { data, error } = await supabase
    .from('characters')
    .update({
      ...updates,
    })
    .eq('id', character_id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function moveCharacter(
  character_id: string,
  newlocation_id: string
) {
  const { data, error } = await supabase
    .from('characters')
    .update({
      currentlocation_id: newlocation_id,
    })
    .eq('id', character_id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function banCharacter(character_id: string, reason?: string) {
  const { data, error } = await supabase
    .from('characters')
    .update({
      status: 'BANNED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', character_id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ===== LOCATION MANAGEMENT =====

export async function createLocation(locationData: {
  name: string
  description: string
  biome?: string
  difficulty?: number
  has_market?: boolean
  has_mining?: boolean
  has_travel?: boolean
  has_chat?: boolean
  welcome_message?: string
  lore?: string
  svg_path_id?: string
  theme?: string
}) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('locations')
    .insert({
      id: generateId(),
      name: locationData.name,
      description: locationData.description,
      biome: locationData.biome || 'plains',
      difficulty: locationData.difficulty || 1,
      location_type: 'REGION',
      player_count: 0,
      has_market: locationData.has_market ?? true,
      has_mining: locationData.has_mining ?? true,
      has_travel: locationData.has_travel ?? true,
      has_chat: locationData.has_chat ?? true,
      chat_scope: 'LOCAL',
      welcome_message: locationData.welcome_message,
      lore: locationData.lore,
      is_private: false,
      is_explored: true,
      status: 'explored',
      svg_path_id: locationData.svg_path_id,
      theme: locationData.theme,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLocation(
  location_id: string,
  updates: Partial<{
    name: string
    description: string
    biome: string
    difficulty: number
    has_market: boolean
    has_mining: boolean
    has_travel: boolean
    has_chat: boolean
    welcome_message: string
    lore: string
    status: string
    theme: string
  }>
) {
  const { data, error } = await supabase
    .from('locations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', location_id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLocation(location_id: string) {
  // First check if any characters are in this location
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name')
    .eq('currentlocation_id', location_id)

  if (characters && characters.length > 0) {
    throw new Error(
      `Cannot delete location: ${
        characters.length
      } characters are currently here (${characters
        .map((c) => c.name)
        .join(', ')})`
    )
  }

  // Delete location resources first (foreign key constraint)
  await supabase
    .from('location_resources')
    .delete()
    .eq('location_id', location_id)

  // Delete market listings for this location
  await supabase.from('market_listings').delete().eq('location_id', location_id)

  // Delete chat messages for this location
  await supabase.from('chat_messages').delete().eq('location_id', location_id)

  // Finally delete the location
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', location_id)

  if (error) throw error
  return true
}

// ===== ITEM MANAGEMENT =====

export async function createItem(itemData: {
  name: string
  description: string
  category: string
  rarity?: string
  layer_type?: string
  durability?: number
  energy_effect?: number
  health_effect?: number
  image_url?: string
}) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('items')
    .insert({
      id: generateId(),
      name: itemData.name,
      description: itemData.description,
      category: itemData.category,
      rarity: itemData.rarity || 'COMMON',
      layer_type: itemData.layer_type,
      durability: itemData.durability,
      energy_effect: itemData.energy_effect,
      health_effect: itemData.health_effect,
      image_url: itemData.image_url,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateItem(
  item_id: string,
  updates: Partial<{
    name: string
    description: string
    category: string
    rarity: string
    layer_type: string
    durability: number
    energy_effect: number
    health_effect: number
    image_url: string
  }>
) {
  const { data, error } = await supabase
    .from('items')
    .update({
      ...updates,
    })
    .eq('id', item_id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteItem(item_id: string) {
  // Check if item is used in location resources
  const { data: resources } = await supabase
    .from('location_resources')
    .select('id, location:locations(name)')
    .eq('item_id', item_id)

  if (resources && resources.length > 0) {
    const locations = resources
      .map((r) => r.location?.name)
      .filter(Boolean)
      .join(', ')
    throw new Error(
      `Cannot delete item: it's used in ${resources.length} mining locations (${locations})`
    )
  }

  // Check if item is in market listings
  const { data: listings } = await supabase
    .from('market_listings')
    .select('id, location:locations(name)')
    .eq('item_id', item_id)

  if (listings && listings.length > 0) {
    const locations = listings
      .map((l) => l.location?.name)
      .filter(Boolean)
      .join(', ')
    throw new Error(
      `Cannot delete item: it has ${listings.length} active market listings (${locations})`
    )
  }

  // Check if item is in character inventories
  const { data: inventories } = await supabase
    .from('character_inventory')
    .select('id, character:characters(name)')
    .eq('item_id', item_id)

  if (inventories && inventories.length > 0) {
    throw new Error(
      `Cannot delete item: ${inventories.length} characters own this item`
    )
  }

  const { error } = await supabase.from('items').delete().eq('id', item_id)

  if (error) throw error
  return true
}

// ===== MINING RESOURCE MANAGEMENT =====

export async function addMiningResource(
  location_id: string,
  item_id: string,
  config: {
    spawn_rate: number
    max_per_day?: number
    difficulty: number
  }
) {
  const { data, error } = await supabase
    .from('location_resources')
    .insert({
      id: generateId(),
      location_id,
      item_id,
      spawn_rate: config.spawn_rate,
      max_per_day: config.max_per_day,
      difficulty: config.difficulty,
    })
    .select(
      `
      *,
      item:items(name),
      location:locations(name)
    `
    )
    .single()

  if (error) throw error
  return data
}

export async function updateMiningResource(
  resourceId: string,
  updates: {
    spawn_rate?: number
    max_per_day?: number
    difficulty?: number
  }
) {
  const { data, error } = await supabase
    .from('location_resources')
    .update(updates)
    .eq('id', resourceId)
    .select(
      `
      *,
      item:items(name),
      location:locations(name)
    `
    )
    .single()

  if (error) throw error
  return data
}

export async function removeMiningResource(resourceId: string) {
  const { error } = await supabase
    .from('location_resources')
    .delete()
    .eq('id', resourceId)

  if (error) throw error
  return true
}

// ===== MARKET MANAGEMENT =====

// ===== MARKET MANAGEMENT FUNCTIONS =====

export async function createMarketListing(listingData: {
  location_id: string
  item_id: string
  price: number
  quantity?: number
  seller_id?: string
  is_systemItem?: boolean
}) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('market_listings')
    .insert({
      id: generateId(),
      location_id: listingData.location_id,
      item_id: listingData.item_id,
      price: listingData.price,
      quantity: listingData.quantity || 1,
      seller_id: listingData.seller_id || null,
      is_systemItem: listingData.is_systemItem || false,
      created_at: now,
      updated_at: now,
    })
    .select(
      `
      *,
      item:items(name, category),
      location:locations(name),
      seller:characters(name)
    `
    )
    .single()

  if (error) throw error
  return data
}

export async function updateMarketListing(
  listingId: string,
  updates: {
    price?: number
    quantity?: number
  }
) {
  const { data, error } = await supabase
    .from('market_listings')
    .update({
      ...updates,
    })
    .eq('id', listingId)
    .select(
      `
      *,
      item:items(name, category),
      location:locations(name),
      seller:characters(name)
    `
    )
    .single()

  if (error) throw error
  return data
}

export async function deleteMarketListing(listingId: string) {
  const { error } = await supabase
    .from('market_listings')
    .delete()
    .eq('id', listingId)

  if (error) throw error
  return true
}

export async function getMarketListings() {
  const { data, error } = await supabase
    .from('market_listings')
    .select(
      `
      id,
      location_id,
      item_id,
      seller_id,
      quantity,
      price,
      is_systemItem,
      created_at,
      updated_at,
      location:locations(name),
      item:items(name, category),
      seller:characters(name)
    `
    )
    .order('updated_at', { ascending: false })

  if (error) throw error

  return (data || []).map((listing) => ({
    id: listing.id,
    location_id: listing.location_id,
    locationName: listing.location?.name || 'Unknown Location',
    item_id: listing.item_id,
    itemName: listing.item?.name || 'Unknown Item',
    seller_id: listing.seller_id,
    sellerName: listing.seller?.name || null,
    quantity: listing.quantity,
    price: listing.price,
    is_systemItem: listing.is_systemItem,
    created_at: new Date(listing.created_at).toLocaleDateString(),
    updated_at: new Date(listing.updated_at).toLocaleDateString(),
  }))
}

export async function bulkUpdateMarketPrices(
  item_id: string,
  newPrice: number,
  location_ids?: string[]
) {
  let query = supabase
    .from('market_listings')
    .update({
      price: newPrice,
    })
    .eq('item_id', item_id)

  if (location_ids && location_ids.length > 0) {
    query = query.in('location_id', location_ids)
  }

  const { data, error } = await query.select()

  if (error) throw error
  return data
}

export async function restockSystemItems() {
  // Restock all system items to their default quantities
  const { data, error } = await supabase
    .from('market_listings')
    .update({
      quantity: 99, // or whatever default stock you want
    })
    .eq('is_systemItem', true)
    .select()

  if (error) throw error
  return data
}

// ===== UTILITY FUNCTIONS =====

function groupBy<T>(array: T[], key: keyof T): Record<string, number> {
  return array.reduce((acc, item) => {
    const groupKey = String(item[key])
    acc[groupKey] = (acc[groupKey] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

export async function validateWorldData() {
  const issues: string[] = []

  try {
    // Check for orphaned characters (in non-existent locations)
    const { data: characters } = await supabase
      .from('characters')
      .select('id, name, currentlocation_id')

    const { data: locations } = await supabase.from('locations').select('id')

    const location_ids = new Set(locations?.map((l) => l.id) || [])

    characters?.forEach((char) => {
      if (!location_ids.has(char.currentlocation_id)) {
        issues.push(
          `Character ${char.name} is in non-existent location ${char.currentlocation_id}`
        )
      }
    })

    // Check for orphaned location resources
    const { data: resources } = await supabase
      .from('location_resources')
      .select('id, location_id, item_id')

    const { data: items } = await supabase.from('items').select('id')

    const item_ids = new Set(items?.map((i) => i.id) || [])

    resources?.forEach((resource) => {
      if (!location_ids.has(resource.location_id)) {
        issues.push(
          `Resource ${resource.id} references non-existent location ${resource.location_id}`
        )
      }
      if (!item_ids.has(resource.item_id)) {
        issues.push(
          `Resource ${resource.id} references non-existent item ${resource.item_id}`
        )
      }
    })

    // Check for orphaned market listings
    const { data: listings } = await supabase
      .from('market_listings')
      .select('id, location_id, item_id, seller_id')

    listings?.forEach((listing) => {
      if (!location_ids.has(listing.location_id)) {
        issues.push(
          `Market listing ${listing.id} references non-existent location ${listing.location_id}`
        )
      }
      if (!item_ids.has(listing.item_id)) {
        issues.push(
          `Market listing ${listing.id} references non-existent item ${listing.item_id}`
        )
      }
    })
  } catch (error) {
    issues.push(`Validation error: ${error.message}`)
  }

  return issues
}

// ===== BULK OPERATIONS =====

export async function bulkUpdateCharacters(
  character_ids: string[],
  updates: {
    health?: number
    energy?: number
    coins?: number
    level?: number
  }
) {
  const { data, error } = await supabase
    .from('characters')
    .update({
      ...updates,
    })
    .in('id', character_ids)
    .select()

  if (error) throw error
  return data
}

export async function resetWorldDay() {
  // Reset daily limits, regenerate energy/health, etc.
  const { data, error } = await supabase
    .from('characters')
    .update({
      energy: 100, // Reset to full energy
    })
    .select()

  if (error) throw error
  return data
}

// ===== ECONOMY FUNCTIONS =====

export async function getEconomyStats() {
  try {
    const { data: characters } = await supabase
      .from('characters')
      .select('coins, level')

    if (!characters) return null

    const totalWealth = characters.reduce((sum, c) => sum + (c.coins || 0), 0)
    const avgWealth =
      characters.length > 0 ? Math.round(totalWealth / characters.length) : 0
    const wealthDistribution = {
      poor: characters.filter((c) => (c.coins || 0) < 50).length,
      middle: characters.filter(
        (c) => (c.coins || 0) >= 50 && (c.coins || 0) < 200
      ).length,
      rich: characters.filter((c) => (c.coins || 0) >= 200).length,
    }

    return {
      totalWealth,
      avgWealth,
      wealthDistribution,
      totalCharacters: characters.length,
    }
  } catch (error) {
    console.error('Error fetching economy stats:', error)
    return null
  }
}

// ===== SVG MAPPING FUNCTIONS =====

export async function getAllLocationsForMapping() {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createLocationFromSvgPath(
  pathId: string,
  locationData: {
    name: string
    description: string
    biome?: string
    difficulty?: number
    has_market?: boolean
    has_mining?: boolean
    has_travel?: boolean
    has_chat?: boolean
    theme?: string
  }
) {
  return await createLocation({
    ...locationData,
    svg_path_id: pathId,
    name:
      locationData.name ||
      pathId
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    description:
      locationData.description ||
      `A location in Earth 2089 mapped from ${pathId}`,
    biome: locationData.biome || 'unknown',
    difficulty: locationData.difficulty || 1,
    has_market: locationData.has_market ?? false,
    has_mining: locationData.has_mining ?? false,
    has_travel: locationData.has_travel ?? true,
    has_chat: locationData.has_chat ?? true,
    theme: locationData.theme || 'default',
  })
}

export async function linkPathToLocation(
  location_id: string,
  svg_path_id: string
) {
  const { data, error } = await supabase
    .from('locations')
    .update({
      svg_path_id: svg_path_id,
    })
    .eq('id', location_id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function unlinkPathFromLocation(location_id: string) {
  const { data, error } = await supabase
    .from('locations')
    .update({
      svg_path_id: null,
    })
    .eq('id', location_id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function bulkUpdateLocationMappings(
  mappings: Array<{ location_id: string; svg_path_id: string | null }>
) {
  const updates = mappings.map(async ({ location_id, svg_path_id }) => {
    return supabase
      .from('locations')
      .update({
        svg_path_id: svg_path_id,
      })
      .eq('id', location_id)
  })

  const results = await Promise.all(updates)
  return results
}
