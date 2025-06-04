/* eslint-disable @typescript-eslint/no-explicit-any */
// scripts/seedDatabase.ts - One-time database setup with seed data
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import {
  LOCATION_SEED_DATA,
  ITEM_SEED_DATA,
  MARKET_SEED_DATA,
  MINING_SEED_DATA,
} from '../config/seedData'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function seedLocations() {
  console.log('🌍 Seeding locations...')

  const locationsToInsert = LOCATION_SEED_DATA.map((location) => ({
    id: location.id,
    name: location.name,
    description: location.description,
    svgpathid: location.svgpathid,
    theme: location.theme,
    biome: location.biome,
    difficulty: location.difficulty,
    locationType: location.locationType,
    hasMarket: location.hasMarket,
    hasMining: location.hasMining,
    hasTravel: location.hasTravel,
    hasChat: location.hasChat,
    chatScope: location.chatScope,
    welcomeMessage: location.welcomeMessage,
    lore: (location as any).lore || null,
    mapX: (location as any).mapX || null,
    mapY: (location as any).mapY || null,
    playerCount: 0,
    isPrivate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('locations')
    .upsert(locationsToInsert, { onConflict: 'id' })

  if (error) {
    console.error('❌ Failed to seed locations:', error)
    throw error
  }

  console.log(`✅ Seeded ${locationsToInsert.length} locations`)
}

async function seedItems() {
  console.log('🎒 Seeding items...')

  const itemsToInsert = ITEM_SEED_DATA.map((item) => ({
    id: randomUUID(),
    name: item.name,
    description: item.description,
    category: item.category,
    layerType: (item as any).layerType || null,
    rarity: item.rarity,
    durability: (item as any).durability || null,
    energyEffect: (item as any).energyEffect || null,
    healthEffect: (item as any).healthEffect || null,
    imageUrl: `/items/${item.name.toLowerCase().replace(/\s+/g, '-')}.png`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('items')
    .upsert(itemsToInsert, { onConflict: 'name' })

  if (error) {
    console.error('❌ Failed to seed items:', error)
    throw error
  }

  console.log(`✅ Seeded ${itemsToInsert.length} items`)
}

async function seedMarketListings() {
  console.log('🏪 Seeding market listings...')

  const marketListings: any[] = []

  for (const [locationName, items] of Object.entries(MARKET_SEED_DATA)) {
    // Get location
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id')
      .eq('name', locationName)
      .single()

    if (locationError || !location) {
      console.warn(`⚠️ Location not found: ${locationName}`)
      continue
    }

    for (const marketItem of items) {
      // Get item
      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id')
        .eq('name', marketItem.itemName)
        .single()

      if (itemError || !item) {
        console.warn(`⚠️ Item not found: ${marketItem.itemName}`)
        continue
      }

      marketListings.push({
        id: crypto.randomUUID(),
        sellerId: null, // System-generated listings
        locationId: location.id,
        itemId: item.id,
        price: marketItem.basePrice,
        quantity: marketItem.quantity,
        isSystemItem: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
  }

  if (marketListings.length > 0) {
    const { error } = await supabase
      .from('market_listings')
      .upsert(marketListings, { onConflict: 'id' })

    if (error) {
      console.error('❌ Failed to seed market listings:', error)
      throw error
    }
  }

  console.log(`✅ Seeded ${marketListings.length} market listings`)
}

async function seedLocationResources() {
  console.log('⛏️ Seeding location resources...')

  const locationResources: any[] = []

  for (const [locationName, resources] of Object.entries(MINING_SEED_DATA)) {
    // Get location
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id')
      .eq('name', locationName)
      .single()

    if (locationError || !location) {
      console.warn(`⚠️ Location not found: ${locationName}`)
      continue
    }

    for (const resource of resources) {
      // Get item
      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id')
        .eq('name', resource.itemName)
        .single()

      if (itemError || !item) {
        console.warn(`⚠️ Item not found: ${resource.itemName}`)
        continue
      }

      locationResources.push({
        id: crypto.randomUUID(),
        locationId: location.id,
        itemId: item.id,
        spawnRate: resource.spawnRate,
        maxPerDay: resource.maxPerDay,
        difficulty: resource.difficulty,
      })
    }
  }

  if (locationResources.length > 0) {
    const { error } = await supabase
      .from('location_resources')
      .upsert(locationResources, { onConflict: 'id' })

    if (error) {
      console.error('❌ Failed to seed location resources:', error)
      throw error
    }
  }

  console.log(`✅ Seeded ${locationResources.length} location resources`)
}

// Main seeding function
export async function seedDatabase() {
  console.log('🚀 Starting database seeding...\n')

  try {
    await seedItems() // Items first (referenced by others)
    await seedLocations() // Locations second
    await seedMarketListings() // Market listings third
    await seedLocationResources() // Mining resources last

    console.log('\n🎉 Database seeding completed successfully!')
  } catch (error) {
    console.error('\n💥 Database seeding failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
}
