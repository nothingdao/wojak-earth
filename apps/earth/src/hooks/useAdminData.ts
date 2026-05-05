/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useAdminData.ts - Convex admin data
import { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { adaptCharacter, adaptLocation, adaptItem, adaptMarketItem } from '@/lib/convex-adapters'
import type { Character, Location, Item, MarketListing } from '@/types'

export interface AdminStats {
  totalCharacters: number
  totalLocations: number
  totalItems: number
  totalResources: number
  activeCharacters: number
  onlineNow: number
  avgPlayerLevel: number
}

export interface AdminActivity {
  id: string
  type: 'character' | 'location' | 'item' | 'market'
  action: string
  target: string
  timestamp: string
  characterName?: string
  locationName?: string
}

export interface EnhancedCharacterForAdmin extends Character {
  locationName: string
}

export interface EnhancedMarketListingForAdmin extends MarketListing {
  locationName: string
  itemName: string
  sellerName: string | null
  isAvailable: boolean
  lastUpdated: string
}

export function useAdminStats() {
  const characters = useQuery(api.earth.characters.getAll, {})
  const locations = useQuery(api.earth.locations.getAll, {})
  const items = useQuery(api.earth.items.getAll, {})

  const loading = characters === undefined || locations === undefined || items === undefined
  const error: string | null = null

  let stats: AdminStats | null = null
  if (!loading) {
    const active = (characters ?? []).filter((c: any) => c.status === 'ACTIVE')
    const online = (characters ?? []).filter((c: any) => c.energy > 50)
    const avgLevel =
      (characters ?? []).length > 0
        ? Math.round(
            ((characters ?? []).reduce((sum: number, c: any) => sum + c.level, 0) /
              (characters ?? []).length) *
              10
          ) / 10
        : 0

    stats = {
      totalCharacters: (characters ?? []).length,
      totalLocations: (locations ?? []).length,
      totalItems: (items ?? []).length,
      totalResources: 0, // TODO: add locationResources query
      activeCharacters: active.length,
      onlineNow: online.length,
      avgPlayerLevel: avgLevel,
    }
  }

  return { stats, loading, error, refetch: () => {} }
}

export function useAdminCharacters() {
  const raw = useQuery(api.earth.characters.getAll, {})
  const rawLocations = useQuery(api.earth.locations.getAll, {})
  const patchCharacter = useMutation(api.earth.characters.nuke) // placeholder

  const loading = raw === undefined
  const error: string | null = null

  const locationMap = new Map((rawLocations ?? []).map((l: any) => [l._id, l.name]))

  const characters: EnhancedCharacterForAdmin[] = (raw ?? []).map((c: any) => ({
    ...adaptCharacter(c),
    locationName: locationMap.get(c.currentLocationId) ?? 'Unknown',
  }))

  const updateCharacter = useCallback(async (_characterId: string, _updates: any) => {
    // TODO: add admin patch character mutation
    console.warn('updateCharacter not yet fully implemented')
    return true
  }, [])

  const moveCharacter = useCallback(async (_characterId: string, _locationId: string) => {
    // TODO: add admin move character mutation
    console.warn('moveCharacter not yet fully implemented')
    return true
  }, [])

  return { characters, loading, error, refetch: () => {}, updateCharacter, moveCharacter }
}

export function useAdminLocations() {
  const raw = useQuery(api.earth.locations.getAll, {})
  const loading = raw === undefined
  const error: string | null = null

  const locations: Location[] = (raw ?? []).map(adaptLocation)

  const updateLocation = useCallback(async (_locationId: string, _updates: any) => {
    // TODO: add admin update location mutation
    console.warn('updateLocation not yet fully implemented')
    return true
  }, [])

  return { locations, loading, error, refetch: () => {}, updateLocation }
}

export function useAdminItems() {
  const raw = useQuery(api.earth.items.getAll, {})
  const upsertItem = useMutation(api.earth.items.upsert)
  const loading = raw === undefined
  const error: string | null = null

  const items: Item[] = (raw ?? []).map(adaptItem)

  const createItem = useCallback(async (itemData: any) => {
    try {
      await upsertItem(itemData)
      return true
    } catch (err) {
      console.error('Error creating item:', err)
      throw err
    }
  }, [upsertItem])

  const updateItem = useCallback(async (_itemId: string, _updates: any) => {
    // TODO: add admin update item mutation
    console.warn('updateItem not yet fully implemented')
    return true
  }, [])

  const deleteItem = useCallback(async (_itemId: string) => {
    // TODO: add admin delete item mutation
    console.warn('deleteItem not yet fully implemented')
    return true
  }, [])

  return { items, loading, error, refetch: () => {}, createItem, updateItem, deleteItem }
}

export function useAdminActivity() {
  const characters = useQuery(api.earth.characters.getAll, {})
  const rawLocations = useQuery(api.earth.locations.getAll, {})
  const loading = characters === undefined

  const locationMap = new Map((rawLocations ?? []).map((l: any) => [l._id, l.name]))

  const activity: AdminActivity[] = (characters ?? [])
    .slice(0, 10)
    .map((c: any) => ({
      id: c._id + '_activity',
      type: 'character' as const,
      action: 'Character created',
      target: `${c.name} in ${locationMap.get(c.currentLocationId) ?? 'Unknown'}`,
      timestamp: c.createdAt ? new Date(c.createdAt).toLocaleString() : 'Unknown',
      characterName: c.name,
      locationName: locationMap.get(c.currentLocationId),
    }))

  return { activity, loading, error: null, refetch: () => {} }
}

export function useAdminMarket() {
  const raw = useQuery(api.earth.market.getByLocation, 'skip' as any)
  const loading = false
  const error: string | null = null

  const marketListings: EnhancedMarketListingForAdmin[] = []

  const updateMarketListing = useCallback(async (_listingId: string, _updates: any) => {
    console.warn('updateMarketListing not yet fully implemented')
    return true
  }, [])

  const deleteMarketListing = useCallback(async (_listingId: string) => {
    console.warn('deleteMarketListing not yet fully implemented')
    return true
  }, [])

  const getMarketStats = () => ({
    totalListings: 0,
    activeListings: 0,
    systemListings: 0,
    totalValue: 0,
    avgPrice: 0,
    locationBreakdown: {},
    itemBreakdown: {},
  })

  return {
    marketListings,
    loading,
    error,
    refetch: () => {},
    refetchMarketListings: () => {},
    updateMarketListing,
    deleteMarketListing,
    getMarketStats,
  }
}
