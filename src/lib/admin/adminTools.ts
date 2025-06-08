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
          .select('id, name, biome, difficulty, playerCount, status'),
        supabase.from('items').select('id, name, category, rarity'),
        supabase
          .from('characters')
          .select('id, name, currentLocationId, level, energy, health, status'),
        supabase
          .from('location_resources')
          .select('id, locationId, itemId, spawnRate, difficulty'),
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
    const charactersByLocation = groupBy(characters, 'currentLocationId')

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
        'id, name, createdAt, currentLocationId, location:locations(name)'
      )
      .order('createdAt', { ascending: false })
      .limit(limit)

    return (characters || []).map((char, index) => ({
      id: char.id + '_activity',
      type: 'character' as const,
      action: 'Character created',
      target: `${char.name} in ${char.location?.name || 'Unknown'}`,
      timestamp: new Date(char.createdAt).toLocaleString(),
    }))
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    return []
  }
}

// ===== CHARACTER MANAGEMENT =====

export async function getCharacterDetails(characterId: string) {
  const { data, error } = await supabase
    .from('characters')
    .select(
      `
      *,
      location:locations(name, biome, difficulty)
    `
    )
    .eq('id', characterId)
    .single()

  if (error) throw error
  return data
}

export async function updateCharacterStats(
  characterId: string,
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
      updatedAt: new Date().toISOString(),
    })
    .eq('id', characterId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function moveCharacter(
  characterId: string,
  newLocationId: string
) {
  const { data, error } = await supabase
    .from('characters')
    .update({
      currentLocationId: newLocationId,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', characterId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function banCharacter(characterId: string, reason?: string) {
  const { data, error } = await supabase
    .from('characters')
    .update({
      status: 'BANNED',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', characterId)
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
  hasMarket?: boolean
  hasMining?: boolean
  hasTravel?: boolean
  hasChat?: boolean
  welcomeMessage?: string
  lore?: string
  svgpathid?: string
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
      locationType: 'REGION',
      playerCount: 0,
      hasMarket: locationData.hasMarket ?? true,
      hasMining: locationData.hasMining ?? true,
      hasTravel: locationData.hasTravel ?? true,
      hasChat: locationData.hasChat ?? true,
      chatScope: 'LOCAL',
      welcomeMessage: locationData.welcomeMessage,
      lore: locationData.lore,
      isPrivate: false,
      isExplored: true,
      status: 'explored',
      svgpathid: locationData.svgpathid,
      theme: locationData.theme,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLocation(
  locationId: string,
  updates: Partial<{
    name: string
    description: string
    biome: string
    difficulty: number
    hasMarket: boolean
    hasMining: boolean
    hasTravel: boolean
    hasChat: boolean
    welcomeMessage: string
    lore: string
    status: string
    theme: string
  }>
) {
  const { data, error } = await supabase
    .from('locations')
    .update({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', locationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLocation(locationId: string) {
  // First check if any characters are in this location
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name')
    .eq('currentLocationId', locationId)

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
    .eq('locationId', locationId)

  // Delete market listings for this location
  await supabase.from('market_listings').delete().eq('locationId', locationId)

  // Delete chat messages for this location
  await supabase.from('chat_messages').delete().eq('locationId', locationId)

  // Finally delete the location
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', locationId)

  if (error) throw error
  return true
}

// ===== ITEM MANAGEMENT =====

export async function createItem(itemData: {
  name: string
  description: string
  category: string
  rarity?: string
  layerType?: string
  durability?: number
  energyEffect?: number
  healthEffect?: number
  imageUrl?: string
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
      layerType: itemData.layerType,
      durability: itemData.durability,
      energyEffect: itemData.energyEffect,
      healthEffect: itemData.healthEffect,
      imageUrl: itemData.imageUrl,
      createdAt: now,
      updatedAt: now,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateItem(
  itemId: string,
  updates: Partial<{
    name: string
    description: string
    category: string
    rarity: string
    layerType: string
    durability: number
    energyEffect: number
    healthEffect: number
    imageUrl: string
  }>
) {
  const { data, error } = await supabase
    .from('items')
    .update({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteItem(itemId: string) {
  // Check if item is used in location resources
  const { data: resources } = await supabase
    .from('location_resources')
    .select('id, location:locations(name)')
    .eq('itemId', itemId)

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
    .eq('itemId', itemId)

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
    .eq('itemId', itemId)

  if (inventories && inventories.length > 0) {
    throw new Error(
      `Cannot delete item: ${inventories.length} characters own this item`
    )
  }

  const { error } = await supabase.from('items').delete().eq('id', itemId)

  if (error) throw error
  return true
}

// ===== MINING RESOURCE MANAGEMENT =====

export async function addMiningResource(
  locationId: string,
  itemId: string,
  config: {
    spawnRate: number
    maxPerDay?: number
    difficulty: number
  }
) {
  const { data, error } = await supabase
    .from('location_resources')
    .insert({
      id: generateId(),
      locationId,
      itemId,
      spawnRate: config.spawnRate,
      maxPerDay: config.maxPerDay,
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
    spawnRate?: number
    maxPerDay?: number
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
  locationId: string
  itemId: string
  price: number
  quantity?: number
  sellerId?: string
  isSystemItem?: boolean
}) {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('market_listings')
    .insert({
      id: generateId(),
      locationId: listingData.locationId,
      itemId: listingData.itemId,
      price: listingData.price,
      quantity: listingData.quantity || 1,
      sellerId: listingData.sellerId || null,
      isSystemItem: listingData.isSystemItem || false,
      createdAt: now,
      updatedAt: now,
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
      updatedAt: new Date().toISOString(),
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
      locationId,
      itemId,
      sellerId,
      quantity,
      price,
      isSystemItem,
      createdAt,
      updatedAt,
      location:locations(name),
      item:items(name, category),
      seller:characters(name)
    `
    )
    .order('updatedAt', { ascending: false })

  if (error) throw error

  return (data || []).map((listing) => ({
    id: listing.id,
    locationId: listing.locationId,
    locationName: listing.location?.name || 'Unknown Location',
    itemId: listing.itemId,
    itemName: listing.item?.name || 'Unknown Item',
    sellerId: listing.sellerId,
    sellerName: listing.seller?.name || null,
    quantity: listing.quantity,
    price: listing.price,
    isSystemItem: listing.isSystemItem,
    createdAt: new Date(listing.createdAt).toLocaleDateString(),
    updatedAt: new Date(listing.updatedAt).toLocaleDateString(),
  }))
}

export async function bulkUpdateMarketPrices(
  itemId: string,
  newPrice: number,
  locationIds?: string[]
) {
  let query = supabase
    .from('market_listings')
    .update({
      price: newPrice,
      updatedAt: new Date().toISOString(),
    })
    .eq('itemId', itemId)

  if (locationIds && locationIds.length > 0) {
    query = query.in('locationId', locationIds)
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
      updatedAt: new Date().toISOString(),
    })
    .eq('isSystemItem', true)
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
      .select('id, name, currentLocationId')

    const { data: locations } = await supabase.from('locations').select('id')

    const locationIds = new Set(locations?.map((l) => l.id) || [])

    characters?.forEach((char) => {
      if (!locationIds.has(char.currentLocationId)) {
        issues.push(
          `Character ${char.name} is in non-existent location ${char.currentLocationId}`
        )
      }
    })

    // Check for orphaned location resources
    const { data: resources } = await supabase
      .from('location_resources')
      .select('id, locationId, itemId')

    const { data: items } = await supabase.from('items').select('id')

    const itemIds = new Set(items?.map((i) => i.id) || [])

    resources?.forEach((resource) => {
      if (!locationIds.has(resource.locationId)) {
        issues.push(
          `Resource ${resource.id} references non-existent location ${resource.locationId}`
        )
      }
      if (!itemIds.has(resource.itemId)) {
        issues.push(
          `Resource ${resource.id} references non-existent item ${resource.itemId}`
        )
      }
    })

    // Check for orphaned market listings
    const { data: listings } = await supabase
      .from('market_listings')
      .select('id, locationId, itemId, sellerId')

    listings?.forEach((listing) => {
      if (!locationIds.has(listing.locationId)) {
        issues.push(
          `Market listing ${listing.id} references non-existent location ${listing.locationId}`
        )
      }
      if (!itemIds.has(listing.itemId)) {
        issues.push(
          `Market listing ${listing.id} references non-existent item ${listing.itemId}`
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
  characterIds: string[],
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
      updatedAt: new Date().toISOString(),
    })
    .in('id', characterIds)
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
      updatedAt: new Date().toISOString(),
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
    hasMarket?: boolean
    hasMining?: boolean
    hasTravel?: boolean
    hasChat?: boolean
    theme?: string
  }
) {
  return await createLocation({
    ...locationData,
    svgpathid: pathId,
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
    hasMarket: locationData.hasMarket ?? false,
    hasMining: locationData.hasMining ?? false,
    hasTravel: locationData.hasTravel ?? true,
    hasChat: locationData.hasChat ?? true,
    theme: locationData.theme || 'default',
  })
}

export async function linkPathToLocation(
  locationId: string,
  svgPathId: string
) {
  const { data, error } = await supabase
    .from('locations')
    .update({
      svgpathid: svgPathId,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', locationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function unlinkPathFromLocation(locationId: string) {
  const { data, error } = await supabase
    .from('locations')
    .update({
      svgpathid: null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', locationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function bulkUpdateLocationMappings(
  mappings: Array<{ locationId: string; svgPathId: string | null }>
) {
  const updates = mappings.map(async ({ locationId, svgPathId }) => {
    return supabase
      .from('locations')
      .update({
        svgpathid: svgPathId,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', locationId)
  })

  const results = await Promise.all(updates)
  return results
}
