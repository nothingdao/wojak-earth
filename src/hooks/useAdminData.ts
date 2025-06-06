// hooks/useAdminData.ts - Custom hook for admin dashboard data

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

export interface AdminStats {
  totalCharacters: number
  totalLocations: number
  totalItems: number
  totalResources: number
  activeCharacters: number
  onlineNow: number
  avgPlayerLevel: number
}

export interface AdminCharacter {
  id: string
  name: string
  gender: string
  currentLocationId: string
  locationName: string
  level: number
  health: number
  energy: number
  coins: number
  status: string
  createdAt: string
}

export interface AdminLocation {
  id: string
  name: string
  description: string
  biome: string
  difficulty: number
  playerCount: number
  hasMarket: boolean
  hasMining: boolean
  hasTravel: boolean
  hasChat: boolean
  status: string
  parentLocationId?: string // Optional parent location for nested locations
}

export interface AdminItem {
  id: string
  name: string
  description: string
  category: string
  rarity: string
  layerType?: string
  durability?: number
  energyEffect?: number
  healthEffect?: number
}

export interface AdminActivity {
  id: string
  type: 'character' | 'mining' | 'travel' | 'market'
  action: string
  target: string
  timestamp: string
  characterName?: string
  locationName?: string
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const [charactersResult, locationsResult, itemsResult, resourcesResult] =
        await Promise.all([
          supabase.from('characters').select('level, energy, status'),
          supabase.from('locations').select('id'),
          supabase.from('items').select('id'),
          supabase.from('location_resources').select('id'),
        ])

      if (charactersResult.error) throw charactersResult.error
      if (locationsResult.error) throw locationsResult.error
      if (itemsResult.error) throw itemsResult.error
      if (resourcesResult.error) throw resourcesResult.error

      const characters = charactersResult.data || []
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

      setStats({
        totalCharacters: characters.length,
        totalLocations: locationsResult.data?.length || 0,
        totalItems: itemsResult.data?.length || 0,
        totalResources: resourcesResult.data?.length || 0,
        activeCharacters: activeCharacters.length,
        onlineNow: onlineCharacters.length,
        avgPlayerLevel: avgLevel,
      })
    } catch (err) {
      console.error('Error fetching admin stats:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { stats, loading, error, refetch: fetchStats }
}

export function useAdminCharacters() {
  const [characters, setCharacters] = useState<AdminCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCharacters = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('characters')
        .select(
          `
          id,
          name,
          gender,
          currentLocationId,
          level,
          health,
          energy,
          coins,
          status,
          createdAt,
          location:locations(name)
        `
        )
        .order('createdAt', { ascending: false })

      if (error) throw error

      const formattedCharacters = (data || []).map((char) => ({
        id: char.id,
        name: char.name,
        gender: char.gender,
        currentLocationId: char.currentLocationId,
        locationName: char.location?.name || 'Unknown',
        level: char.level,
        health: char.health,
        energy: char.energy,
        coins: char.coins,
        status: char.status,
        createdAt: new Date(char.createdAt).toLocaleDateString(),
      }))

      setCharacters(formattedCharacters)
    } catch (err) {
      console.error('Error fetching characters:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateCharacter = async (
    characterId: string,
    updates: {
      health?: number
      energy?: number
      coins?: number
      level?: number
      status?: string
    }
  ) => {
    try {
      const { error } = await supabase
        .from('characters')
        .update(updates)
        .eq('id', characterId)

      if (error) throw error

      // Refresh characters list
      await fetchCharacters()
      return true
    } catch (err) {
      console.error('Error updating character:', err)
      throw err
    }
  }

  const moveCharacter = async (characterId: string, newLocationId: string) => {
    try {
      const { error } = await supabase
        .from('characters')
        .update({ currentLocationId: newLocationId })
        .eq('id', characterId)

      if (error) throw error

      await fetchCharacters()
      return true
    } catch (err) {
      console.error('Error moving character:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchCharacters()
  }, [])

  return {
    characters,
    loading,
    error,
    refetch: fetchCharacters,
    updateCharacter,
    moveCharacter,
  }
}

export function useAdminLocations() {
  const [locations, setLocations] = useState<AdminLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLocations = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('difficulty', { ascending: true })

      if (error) throw error

      setLocations(data || [])
    } catch (err) {
      console.error('Error fetching locations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateLocation = async (
    locationId: string,
    updates: Partial<AdminLocation>
  ) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', locationId)

      if (error) throw error

      await fetchLocations()
      return true
    } catch (err) {
      console.error('Error updating location:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchLocations()
  }, [])

  return {
    locations,
    loading,
    error,
    refetch: fetchLocations,
    updateLocation,
  }
}

export function useAdminItems() {
  const [items, setItems] = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      setItems(data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createItem = async (itemData: Omit<AdminItem, 'id'>) => {
    try {
      const { error } = await supabase.from('items').insert(itemData)

      if (error) throw error

      await fetchItems()
      return true
    } catch (err) {
      console.error('Error creating item:', err)
      throw err
    }
  }

  const updateItem = async (itemId: string, updates: Partial<AdminItem>) => {
    try {
      const { error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', itemId)

      if (error) throw error

      await fetchItems()
      return true
    } catch (err) {
      console.error('Error updating item:', err)
      throw err
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      // Check if item is used in location resources
      const { data: resources } = await supabase
        .from('location_resources')
        .select('id')
        .eq('itemId', itemId)

      if (resources && resources.length > 0) {
        throw new Error(
          `Cannot delete item: it's used in ${resources.length} mining locations`
        )
      }

      const { error } = await supabase.from('items').delete().eq('id', itemId)

      if (error) throw error

      await fetchItems()
      return true
    } catch (err) {
      console.error('Error deleting item:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
    createItem,
    updateItem,
    deleteItem,
  }
}

export function useAdminActivity() {
  const [activity, setActivity] = useState<AdminActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = async () => {
    try {
      setLoading(true)
      setError(null)

      // For now, create mock recent activity based on character data
      // You could create an actual activity_log table later
      const { data: recentCharacters } = await supabase
        .from('characters')
        .select(
          'id, name, createdAt, currentLocationId, location:locations(name)'
        )
        .order('createdAt', { ascending: false })
        .limit(10)

      const mockActivity: AdminActivity[] = (recentCharacters || []).map(
        (char, index) => ({
          id: char.id + '_activity',
          type: 'character' as const,
          action: 'Character created',
          target: `${char.name} in ${char.location?.name || 'Unknown'}`,
          timestamp: new Date(char.createdAt).toLocaleString(),
          characterName: char.name,
          locationName: char.location?.name,
        })
      )

      setActivity(mockActivity)
    } catch (err) {
      console.error('Error fetching activity:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivity()
  }, [])

  return { activity, loading, error, refetch: fetchActivity }
}

export interface AdminMarketListing {
  id: string
  locationId: string
  locationName: string
  itemId: string
  itemName: string
  sellerId?: string
  sellerName?: string
  quantity: number
  price: number // Just price, not basePrice/currentPrice
  isSystemItem: boolean
  createdAt: string
  updatedAt: string
  isAvailable?: boolean // Optional, if we want to track availability
  lastUpdated?: string // Optional, if we want to track last updated time
}

export function useAdminMarket() {
  const [marketListings, setMarketListings] = useState<AdminMarketListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarketListings = async () => {
    try {
      setLoading(true)
      setError(null)

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
          item:items(name),
          seller:characters(name)
        `
        )
        .order('updatedAt', { ascending: false })

      if (error) throw error

      const formattedListings = (data || []).map((listing) => ({
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
        isAvailable: listing.quantity > 0,
        lastUpdated: new Date(listing.updatedAt).toLocaleDateString(),
      }))

      setMarketListings(formattedListings)
    } catch (err) {
      console.error('Error fetching market listings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateMarketListing = async (
    listingId: string,
    updates: {
      quantity?: number
      price?: number
    }
  ) => {
    try {
      const { error } = await supabase
        .from('market_listings')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', listingId)

      if (error) throw error

      await fetchMarketListings()
      return true
    } catch (err) {
      console.error('Error updating market listing:', err)
      throw err
    }
  }

  const deleteMarketListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('market_listings')
        .delete()
        .eq('id', listingId)

      if (error) throw error

      await fetchMarketListings()
      return true
    } catch (err) {
      console.error('Error deleting market listing:', err)
      throw err
    }
  }

  const getMarketStats = () => {
    const totalListings = marketListings.length
    const activeListings = marketListings.filter((l) => l.quantity > 0).length
    const systemListings = marketListings.filter((l) => l.isSystemItem).length
    const totalValue = marketListings.reduce(
      (sum, l) => sum + l.price * l.quantity,
      0
    )
    const avgPrice =
      marketListings.length > 0
        ? Math.round(
            marketListings.reduce((sum, l) => sum + l.price, 0) /
              marketListings.length
          )
        : 0

    const locationBreakdown = marketListings.reduce((acc, listing) => {
      acc[listing.locationName] = (acc[listing.locationName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const itemBreakdown = marketListings.reduce((acc, listing) => {
      acc[listing.itemName] = (acc[listing.itemName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalListings,
      activeListings,
      systemListings,
      totalValue,
      avgPrice,
      locationBreakdown,
      itemBreakdown,
    }
  }

  useEffect(() => {
    fetchMarketListings()
  }, [])

  return {
    marketListings,
    loading,
    error,
    refetch: fetchMarketListings,
    refetchMarketListings: fetchMarketListings, // Alias for consistency
    updateMarketListing,
    deleteMarketListing,
    getMarketStats,
  }
}
