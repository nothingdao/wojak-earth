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

function notMigrated(name: string): never {
  throw new Error(`${name} is pending Convex admin mutation migration`)
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

export async function updateCharacterStats(_characterId: string, _updates: any) {
  return notMigrated('updateCharacterStats')
}

export async function banCharacter(_characterId: string, _reason?: string) {
  return notMigrated('banCharacter')
}

export async function updateLocation(_locationId: string, _updates: any) {
  return notMigrated('updateLocation')
}

export async function updateItem(_itemId: string, _updates: any) {
  return notMigrated('updateItem')
}

export async function updateMarketListing(_listingId: string, _updates: any) {
  return notMigrated('updateMarketListing')
}

export async function createMarketListing(_listingData: any) {
  return notMigrated('createMarketListing')
}

export async function deleteItem(_itemId: string) {
  return notMigrated('deleteItem')
}

export async function deleteLocation(_locationId: string) {
  return notMigrated('deleteLocation')
}

export async function deleteMarketListing(_listingId: string) {
  return notMigrated('deleteMarketListing')
}

export async function validateWorldData(): Promise<string[]> {
  return []
}

export async function resetWorldDay() {
  return notMigrated('resetWorldDay')
}
