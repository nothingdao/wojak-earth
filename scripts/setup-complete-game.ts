// scripts/setup-complete-game.ts - One script to rule them all
import { PrismaClient, ItemCategory, LayerType, Rarity } from '@prisma/client'

const prisma = new PrismaClient()

// All items combined (themed + tools)
const ALL_NEW_ITEMS = [
  // === THEMED ITEMS ===
  {
    name: 'Rare Floppy Disk',
    description: 'Contains legendary source code from the early net',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.LEGENDARY,
    imageUrl: '/items/rare-floppy-disk.png',
  },
  {
    name: 'Cyberpunk Shades',
    description: 'AR-enhanced sunglasses with data overlay',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    energyEffect: 10,
    imageUrl: '/items/cyberpunk-shades.png',
  },
  {
    name: 'Neon Visor',
    description: 'Glowing headgear that screams "I hack the planet"',
    category: ItemCategory.HAT,
    layerType: LayerType.HAT,
    rarity: Rarity.EPIC,
    energyEffect: 15,
    imageUrl: '/items/neon-visor.png',
  },
  {
    name: 'Heavy Duty Boots',
    description: 'Steel-toed boots for serious mining work',
    category: ItemCategory.CLOTHING,
    layerType: LayerType.CLOTHING,
    rarity: Rarity.UNCOMMON,
    healthEffect: 10,
    imageUrl: '/items/heavy-duty-boots.png',
  },
  {
    name: 'Desert Wrap',
    description: 'Traditional headwrap that protects from sandstorms',
    category: ItemCategory.HAT,
    layerType: LayerType.HAT,
    rarity: Rarity.UNCOMMON,
    healthEffect: 8,
    imageUrl: '/items/desert-wrap.png',
  },
  {
    name: 'Rainbow Hoodie',
    description: 'Psychedelic hoodie that shifts colors in the light',
    category: ItemCategory.CLOTHING,
    layerType: LayerType.CLOTHING,
    rarity: Rarity.EPIC,
    energyEffect: 20,
    imageUrl: '/items/rainbow-hoodie.png',
  },

  // === TOOL ITEMS ===
  {
    name: 'Basic Pickaxe',
    description: 'Standard mining tool for beginners',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.COMMON,
    durability: 50,
    imageUrl: '/items/basic-pickaxe.png',
  },
  {
    name: 'Multi-Tool',
    description: 'Swiss army knife of the digital age',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.COMMON,
    durability: 100,
    imageUrl: '/items/multi-tool.png',
  },
  {
    name: 'Hacking Toolkit',
    description: 'Portable device for digital infiltration',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 150,
    imageUrl: '/items/hacking-toolkit.png',
  },
  {
    name: 'Omni-Tool',
    description: 'Legendary device that adapts to any situation',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.LEGENDARY,
    durability: 1000,
    energyEffect: 20,
    healthEffect: 10,
    imageUrl: '/items/omni-tool.png',
  },
]

// Enhanced market configs (simplified - core items only)
const MARKET_CONFIGS = {
  'Mining Plains': [
    { name: 'Miners Hat', quantity: 8, price: 15 },
    { name: 'Basic Pickaxe', quantity: 5, price: 20 },
    { name: 'Multi-Tool', quantity: 3, price: 35 },
    { name: 'Energy Drink', quantity: 15, price: 8 },
    { name: 'Heavy Duty Boots', quantity: 2, price: 45 },
  ],
  'Central Exchange': [
    { name: 'Cyberpunk Shades', quantity: 3, price: 65 },
    { name: 'Neon Visor', quantity: 1, price: 150 },
    { name: 'Hacking Toolkit', quantity: 2, price: 120 },
    { name: 'Rainbow Hoodie', quantity: 1, price: 200 },
    { name: 'Rare Floppy Disk', quantity: 1, price: 500 },
  ],
  'Desert Outpost': [
    { name: 'Desert Wrap', quantity: 4, price: 35 },
    { name: 'Energy Drink', quantity: 6, price: 15 },
    { name: 'Health Potion', quantity: 4, price: 35 },
  ],
  'The Glitch Club': [
    { name: 'Cyberpunk Shades', quantity: 4, price: 55 },
    { name: 'Hacking Toolkit', quantity: 3, price: 100 },
    { name: 'Multi-Tool', quantity: 4, price: 30 },
  ],
  'Rusty Pickaxe Inn': [
    { name: 'Energy Drink', quantity: 20, price: 10 },
    { name: 'Basic Pickaxe', quantity: 8, price: 18 },
    { name: 'Multi-Tool', quantity: 5, price: 32 },
  ],
  'Crystal Caves': [
    { name: 'Energy Drink', quantity: 12, price: 12 },
    { name: 'Health Potion', quantity: 8, price: 28 },
    { name: 'Omni-Tool', quantity: 1, price: 3500 },
  ],
  'Cyber City': [
    { name: 'Energy Drink', quantity: 10, price: 15 },
    { name: 'Health Potion', quantity: 8, price: 30 },
  ],
}

// Mining configs (simplified)
const MINING_CONFIGS = {
  'Mining Plains': [
    { name: 'Dirty Coal', spawnRate: 0.5, maxPerDay: 25, difficulty: 1 },
    { name: 'Iron Scraps', spawnRate: 0.35, maxPerDay: 15, difficulty: 1 },
    { name: 'Basic Pickaxe', spawnRate: 0.08, maxPerDay: 3, difficulty: 1 },
  ],
  'Crystal Caves': [
    { name: 'Crystal Shard', spawnRate: 0.15, maxPerDay: 5, difficulty: 3 },
    { name: 'Ancient Coin', spawnRate: 0.08, maxPerDay: 3, difficulty: 2 },
    { name: 'Omni-Tool', spawnRate: 0.002, maxPerDay: 1, difficulty: 5 },
  ],
  'Desert Outpost': [
    { name: 'Ancient Coin', spawnRate: 0.18, maxPerDay: 8, difficulty: 3 },
    { name: 'Crystal Shard', spawnRate: 0.06, maxPerDay: 2, difficulty: 4 },
  ],
  'Central Exchange': [
    { name: 'Hacking Toolkit', spawnRate: 0.02, maxPerDay: 1, difficulty: 4 },
  ],
  'The Glitch Club': [
    { name: 'Hacking Toolkit', spawnRate: 0.035, maxPerDay: 2, difficulty: 3 },
  ],
}

async function setupCompleteGame() {
  console.log('🎮 Setting up complete Wojak Earth game...\n')

  try {
    // Step 1: Add all items
    console.log('📦 STEP 1: Adding items...')
    let itemsAdded = 0

    for (const itemData of ALL_NEW_ITEMS) {
      const existingItem = await prisma.item.findUnique({
        where: { name: itemData.name },
      })

      if (!existingItem) {
        await prisma.item.create({ data: itemData })
        console.log(`  ✨ Added ${itemData.name} (${itemData.rarity})`)
        itemsAdded++
      }
    }
    console.log(`✅ Added ${itemsAdded} new items\n`)

    // Step 2: Fix market locations
    console.log('🏪 STEP 2: Fixing market locations...')
    await prisma.location.updateMany({
      where: {
        name: { in: ['Crystal Caves', 'The Glitch Club', 'Cyber City'] },
      },
      data: { hasMarket: true },
    })
    console.log('✅ Market locations fixed\n')

    // Step 3: Setup mining resources
    console.log('⛏️ STEP 3: Setting up mining resources...')
    const locations = await prisma.location.findMany({
      where: { hasMining: true },
    })
    const items = await prisma.item.findMany()
    const itemMap = new Map(items.map((item) => [item.name, item]))

    let miningResourcesAdded = 0

    for (const location of locations) {
      const configs =
        MINING_CONFIGS[location.name as keyof typeof MINING_CONFIGS]
      if (!configs) continue

      for (const config of configs) {
        const item = itemMap.get(config.name)
        if (!item) continue

        const existing = await prisma.locationResource.findUnique({
          where: {
            locationId_itemId: { locationId: location.id, itemId: item.id },
          },
        })

        if (!existing) {
          await prisma.locationResource.create({
            data: {
              locationId: location.id,
              itemId: item.id,
              spawnRate: config.spawnRate,
              maxPerDay: config.maxPerDay,
              difficulty: config.difficulty,
            },
          })
          miningResourcesAdded++
        }
      }
    }
    console.log(`✅ Added ${miningResourcesAdded} mining resources\n`)

    // Step 4: Setup markets
    console.log('🛒 STEP 4: Setting up markets...')
    const marketLocations = await prisma.location.findMany({
      where: { hasMarket: true },
    })

    let marketListingsAdded = 0

    for (const location of marketLocations) {
      const configs =
        MARKET_CONFIGS[location.name as keyof typeof MARKET_CONFIGS]
      if (!configs) continue

      for (const config of configs) {
        const item = itemMap.get(config.name)
        if (!item) continue

        const existing = await prisma.marketListing.findFirst({
          where: {
            locationId: location.id,
            itemId: item.id,
            isSystemItem: true,
          },
        })

        if (existing) {
          await prisma.marketListing.update({
            where: { id: existing.id },
            data: { quantity: config.quantity, price: config.price },
          })
        } else {
          await prisma.marketListing.create({
            data: {
              locationId: location.id,
              itemId: item.id,
              quantity: config.quantity,
              price: config.price,
              isSystemItem: true,
            },
          })
          marketListingsAdded++
        }
      }
    }
    console.log(`✅ Added/updated ${marketListingsAdded} market listings\n`)

    // Final summary
    console.log('🎉 SETUP COMPLETE!')
    console.log('='.repeat(50))

    const totalItems = await prisma.item.count()
    const totalMiningNodes = await prisma.locationResource.count()
    const totalMarketListings = await prisma.marketListing.count({
      where: { isSystemItem: true },
    })

    console.log(`📦 Total items in database: ${totalItems}`)
    console.log(`⛏️ Total mining resource nodes: ${totalMiningNodes}`)
    console.log(`🛒 Total market listings: ${totalMarketListings}`)

    console.log('\n🚀 Your game is ready! Run `npm run dev` to start playing!')
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setupCompleteGame()
