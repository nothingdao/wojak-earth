// scripts/setup-new-regions-content.ts - Markets & Mining for the 5 new regions
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Market configurations for new regions
const NEW_MARKET_CONFIGS = {
  'The Glitch Wastes': [
    { name: 'Glitch Goggles', quantity: 2, price: 120 },
    { name: 'Buffer Overflow Potion', quantity: 1, price: 200 },
    { name: 'Pixel Dust', quantity: 15, price: 8 },
    { name: 'Energy Drink', quantity: 5, price: 20 }, // More expensive in harsh digital wasteland
    { name: 'Hacking Toolkit', quantity: 3, price: 90 }, // Cheaper here
    { name: 'Signal Booster', quantity: 2, price: 60 },
  ],

  'Error 404 Oasis': [
    { name: 'Buffer Overflow Potion', quantity: 3, price: 180 }, // Oasis specialty
    { name: 'Health Potion', quantity: 8, price: 40 },
    { name: 'Temporal Stabilizer', quantity: 2, price: 85 }, // Cross-region rare item
  ],

  'Fungi Networks': [
    { name: 'Symbiotic Armor', quantity: 1, price: 300 },
    { name: 'Decay Catalyst', quantity: 2, price: 150 },
    { name: 'Neural Spores', quantity: 12, price: 25 },
    { name: 'Mycelium Thread', quantity: 20, price: 5 },
    { name: 'Health Potion', quantity: 15, price: 18 }, // Cheaper organic healing
    { name: 'Bone Marrow Elixir', quantity: 4, price: 60 },
  ],

  'Spore Exchange': [
    { name: 'Neural Spores', quantity: 25, price: 20 }, // Exchange specialty
    { name: 'Mycelium Thread', quantity: 50, price: 3 },
    { name: 'Living Bone Tools', quantity: 2, price: 180 },
    { name: 'Symbiotic Armor', quantity: 2, price: 280 },
  ],

  'Temporal Rift Zone': [
    { name: 'Paradox Engine', quantity: 1, price: 5000 }, // Ultra rare legendary
    { name: 'Temporal Flux', quantity: 2, price: 1000 },
    { name: 'Causality Loop', quantity: 3, price: 400 },
    { name: 'Temporal Stabilizer', quantity: 8, price: 75 },
    { name: 'Energy Drink', quantity: 3, price: 25 }, // Time dilation makes everything expensive
  ],

  "Yesterday's Tomorrow": [
    { name: 'Temporal Stabilizer', quantity: 15, price: 65 }, // Tomorrow's specialty
    { name: 'Causality Loop', quantity: 5, price: 350 },
    { name: 'Quantum Processor', quantity: 1, price: 400 }, // From other regions
    { name: 'Ancient Coin', quantity: 10, price: 30 }, // From various timelines
  ],

  'The Bone Markets': [
    { name: 'Living Bone Tools', quantity: 4, price: 160 },
    { name: 'Skeletal Framework', quantity: 2, price: 220 },
    { name: 'Calcium Crystals', quantity: 20, price: 15 },
    { name: 'Bone Marrow Elixir', quantity: 12, price: 45 },
    { name: 'Ancient Coin', quantity: 8, price: 40 }, // Bones are old
    { name: 'Health Potion', quantity: 6, price: 50 }, // Death-adjacent pricing
  ],

  'Calcium Exchange': [
    { name: 'Calcium Crystals', quantity: 40, price: 10 }, // Exchange bulk pricing
    { name: 'Living Bone Tools', quantity: 8, price: 140 },
    { name: 'Skeletal Framework', quantity: 4, price: 200 },
    { name: 'Ancient Artifact', quantity: 1, price: 800 }, // Rare ancient find
  ],

  'Static Fields': [
    { name: 'Signal Booster Helmet', quantity: 2, price: 180 },
    { name: 'White Noise Generator', quantity: 3, price: 130 },
    { name: 'Frequency Modulator', quantity: 2, price: 200 },
    { name: 'Static Cling', quantity: 25, price: 6 },
    { name: 'Glitch Goggles', quantity: 1, price: 140 }, // Cross-region synergy
  ],

  'Dead Air Tavern': [
    { name: 'Energy Drink', quantity: 12, price: 15 },
    { name: 'Static Cling', quantity: 30, price: 4 }, // Tavern bulk
    { name: 'Frequency Modulator', quantity: 3, price: 180 },
    { name: 'Code Energy Drink', quantity: 8, price: 22 }, // Digital synergy
  ],
}

// Mining configurations for new regions
const NEW_MINING_CONFIGS = {
  'The Glitch Wastes': [
    { name: 'Pixel Dust', spawnRate: 0.4, maxPerDay: 20, difficulty: 4 },
    { name: 'Fragmented Code', spawnRate: 0.12, maxPerDay: 6, difficulty: 5 },
    { name: 'Static Cling', spawnRate: 0.25, maxPerDay: 12, difficulty: 4 },
    { name: 'Glitch Goggles', spawnRate: 0.02, maxPerDay: 1, difficulty: 6 },
  ],

  'Corrupted Data Mines': [
    { name: 'Fragmented Code', spawnRate: 0.3, maxPerDay: 10, difficulty: 5 },
    { name: 'Pixel Dust', spawnRate: 0.6, maxPerDay: 25, difficulty: 4 },
    { name: 'Buffer Overflow Potion', spawnRate: 0.008, maxPerDay: 1, difficulty: 7 }, // Ultra rare
  ],

  'Fungi Networks': [
    { name: 'Mycelium Thread', spawnRate: 0.5, maxPerDay: 30, difficulty: 3 },
    { name: 'Neural Spores', spawnRate: 0.25, maxPerDay: 15, difficulty: 3 },
    { name: 'Decay Catalyst', spawnRate: 0.08, maxPerDay: 3, difficulty: 4 },
  ],

  'The Great Mycelium': [
    { name: 'Neural Spores', spawnRate: 0.4, maxPerDay: 20, difficulty: 4 },
    { name: 'Symbiotic Armor', spawnRate: 0.015, maxPerDay: 1, difficulty: 5 },
    { name: 'Mycelium Thread', spawnRate: 0.7, maxPerDay: 35, difficulty: 3 },
  ],

  'Temporal Rift Zone': [
    { name: 'Temporal Flux', spawnRate: 0.05, maxPerDay: 2, difficulty: 6 }, // Very rare
    { name: 'Causality Loop', spawnRate: 0.08, maxPerDay: 3, difficulty: 5 },
    { name: 'Temporal Stabilizer', spawnRate: 0.15, maxPerDay: 8, difficulty: 5 },
  ],

  'Clock Tower Ruins': [
    { name: 'Temporal Flux', spawnRate: 0.08, maxPerDay: 3, difficulty: 6 },
    { name: 'Paradox Engine', spawnRate: 0.001, maxPerDay: 1, difficulty: 8 }, // Legendary rare
    { name: 'Ancient Coin', spawnRate: 0.2, maxPerDay: 10, difficulty: 4 }, // Time displaced
  ],

  'The Bone Markets': [
    { name: 'Calcium Crystals', spawnRate: 0.35, maxPerDay: 18, difficulty: 3 },
    { name: 'Living Bone Tools', spawnRate: 0.06, maxPerDay: 3, difficulty: 4 },
    { name: 'Ancient Coin', spawnRate: 0.18, maxPerDay: 8, difficulty: 3 }, // Grave goods
  ],

  'Static Fields': [
    { name: 'Static Cling', spawnRate: 0.45, maxPerDay: 22, difficulty: 4 },
    { name: 'White Noise Generator', spawnRate: 0.07, maxPerDay: 3, difficulty: 5 },
    { name: 'Frequency Modulator', spawnRate: 0.04, maxPerDay: 2, difficulty: 5 },
  ],

  'Channel 0': [
    { name: 'Static Cling', spawnRate: 0.6, maxPerDay: 30, difficulty: 4 },
    { name: 'Signal Booster Helmet', spawnRate: 0.02, maxPerDay: 1, difficulty: 6 },
    { name: 'Frequency Modulator', spawnRate: 0.08, maxPerDay: 4, difficulty: 5 },
  ],
}

async function setupNewRegionsContent() {
  console.log('🛒 Setting up markets and mining for new regions...\n')

  try {
    // Get all locations and items for reference
    const locations = await prisma.location.findMany({
      where: { hasMarket: true }
    })
    const miningLocations = await prisma.location.findMany({
      where: { hasMining: true }
    })
    const items = await prisma.item.findMany()
    const itemMap = new Map(items.map(item => [item.name, item]))

    console.log(`📍 Found ${locations.length} market locations`)
    console.log(`⛏️ Found ${miningLocations.length} mining locations`)

    // Setup markets
    console.log('\n🏪 Setting up markets...')
    let marketListingsAdded = 0

    for (const location of locations) {
      const config = NEW_MARKET_CONFIGS[location.name as keyof typeof NEW_MARKET_CONFIGS]
      if (!config) continue

      console.log(`  📦 Stocking ${location.name}...`)

      for (const itemConfig of config) {
        const item = itemMap.get(itemConfig.name)
        if (!item) {
          console.log(`    ❌ Item '${itemConfig.name}' not found`)
          continue
        }

        // Check if listing already exists
        const existing = await prisma.marketListing.findFirst({
          where: {
            locationId: location.id,
            itemId: item.id,
            isSystemItem: true
          }
        })

        if (existing) {
          await prisma.marketListing.update({
            where: { id: existing.id },
            data: {
              quantity: itemConfig.quantity,
              price: itemConfig.price
            }
          })
        } else {
          await prisma.marketListing.create({
            data: {
              locationId: location.id,
              itemId: item.id,
              quantity: itemConfig.quantity,
              price: itemConfig.price,
              isSystemItem: true
            }
          })
          marketListingsAdded++
        }
      }
    }
    console.log(`✅ Added/updated ${marketListingsAdded} market listings`)

    // Setup mining
    console.log('\n⛏️ Setting up mining resources...')
    let miningResourcesAdded = 0

    for (const location of miningLocations) {
      const config = NEW_MINING_CONFIGS[location.name as keyof typeof NEW_MINING_CONFIGS]
      if (!config) continue

      console.log(`  🗿 Adding resources to ${location.name}...`)

      for (const resourceConfig of config) {
        const item = itemMap.get(resourceConfig.name)
        if (!item) {
          console.log(`    ❌ Item '${resourceConfig.name}' not found`)
          continue
        }

        // Check if resource already exists
        const existing = await prisma.locationResource.findUnique({
          where: {
            locationId_itemId: {
              locationId: location.id,
              itemId: item.id
            }
          }
        })

        if (!existing) {
          await prisma.locationResource.create({
            data: {
              locationId: location.id,
              itemId: item.id,
              spawnRate: resourceConfig.spawnRate,
              maxPerDay: resourceConfig.maxPerDay,
              difficulty: resourceConfig.difficulty
            }
          })
          m
