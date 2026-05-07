// lib/admin/adminTools.ts
import { convexHttp } from '@/lib/convex-singleton'
import { api } from '@convex/_generated/api'

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

function deferred(name: string): never {
  throw new Error(`${name} is disabled: Convex admin mutation is not implemented yet`)
}

export async function getWorldOverview() {
  const [locations, items, characters] = await Promise.all([
    convexHttp.query(api.earth.locations.getAll, {}),
    convexHttp.query(api.earth.items.getAll, {}),
    convexHttp.query(api.earth.characters.getAll, {}),
  ])

  const activeCharacters = characters.filter((c: any) => c.status === 'ACTIVE')
  const onlineCharacters = characters.filter((c: any) => c.energy > 50)
  const avgLevel =
    characters.length > 0
      ? Math.round(
          (characters.reduce((sum: number, c: any) => sum + c.level, 0) / characters.length) * 10
        ) / 10
      : 0

  return {
    totals: {
      locations: locations.length,
      items: items.length,
      characters: characters.length,
      activeCharacters: activeCharacters.length,
      onlineNow: onlineCharacters.length,
    },
    stats: { avgPlayerLevel: avgLevel },
    breakdowns: {
      locationsByBiome: groupBy(locations, 'biome' as any),
      itemsByCategory: groupBy(items, 'category' as any),
      itemsByRarity: groupBy(items, 'rarity' as any),
      charactersByLocation: groupBy(characters, 'currentLocationId' as any),
    },
    data: { locations, items, characters },
  }
}

export async function createLocation(locationData: any) {
  return convexHttp.mutation(api.earth.locations.upsert, locationData)
}

export async function createItem(itemData: any) {
  return convexHttp.mutation(api.earth.items.upsert, itemData)
}

export async function updateCharacterStats(characterId: string, updates: any) {
  return convexHttp.mutation(api.earth.characters.adminUpdateStats, { characterId: characterId as any, updates })
}

export async function banCharacter(characterId: string, reason?: string) {
  return convexHttp.mutation(api.earth.characters.adminSetStatus, {
    characterId: characterId as any,
    status: 'BANNED',
    reason,
  })
}

export async function updateLocation(locationId: string, updates: any) {
  return convexHttp.mutation(api.earth.locations.adminUpdate, { locationId: locationId as any, updates })
}

export async function updateItem(itemId: string, updates: any) {
  return convexHttp.mutation(api.earth.items.adminUpdate, { itemId: itemId as any, updates })
}

export async function updateMarketListing(listingId: string, updates: any) {
  return convexHttp.mutation(api.earth.market.adminUpdateListing, { listingId: listingId as any, updates })
}

export async function createMarketListing(listingData: any) {
  return convexHttp.mutation(api.earth.market.adminCreateListing, listingData)
}

export async function deleteItem(_itemId: string) {
  return deferred('deleteItem')
}

export async function deleteLocation(_locationId: string) {
  return deferred('deleteLocation')
}

export async function deleteMarketListing(listingId: string) {
  return convexHttp.mutation(api.earth.market.adminDeleteListing, { listingId: listingId as any })
}

export async function validateWorldData(): Promise<string[]> {
  return []
}

export async function resetWorldDay() {
  return convexHttp.mutation(api.earth.characters.adminResetWorldDay, {})
}
