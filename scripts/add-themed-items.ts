// scripts/add-themed-items.ts - New items for different locations
import { PrismaClient, ItemCategory, LayerType, Rarity } from '@prisma/client'

const prisma = new PrismaClient()

const NEW_ITEMS = [
  // === CYBER CITY / GLITCH CLUB HACKER ITEMS ===
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
    name: 'Data Spike',
    description: 'Neural interface tool for direct data access',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    imageUrl: '/items/data-spike.png',
  },
  {
    name: 'Code Energy Drink',
    description: 'Caffeinated fuel for all-night coding sessions',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.COMMON,
    energyEffect: 35,
    imageUrl: '/items/code-energy-drink.png',
  },
  {
    name: 'Bitcoin Fragment',
    description: 'Corrupted cryptocurrency data from the old web',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.EPIC,
    imageUrl: '/items/bitcoin-fragment.png',
  },

  // === MINING PLAINS INDUSTRIAL ITEMS ===
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
    name: 'Reinforced Pickaxe',
    description: 'Professional mining tool with titanium edge',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 200,
    imageUrl: '/items/reinforced-pickaxe.png',
  },
  {
    name: 'Safety Goggles',
    description: 'Protects eyes from flying debris and dust',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.COMMON,
    healthEffect: 5,
    imageUrl: '/items/safety-goggles.png',
  },
  {
    name: 'Protein Bar',
    description: 'High-energy snack for hardworking miners',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.COMMON,
    energyEffect: 15,
    healthEffect: 5,
    imageUrl: '/items/protein-bar.png',
  },
  {
    name: 'Rare Earth Metal',
    description: 'Valuable minerals used in advanced technology',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.RARE,
    imageUrl: '/items/rare-earth-metal.png',
  },

  // === DESERT OUTPOST SURVIVAL ITEMS ===
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
    name: 'Survival Cloak',
    description: 'Weather-resistant cloak for harsh desert conditions',
    category: ItemCategory.CLOTHING,
    layerType: LayerType.CLOTHING,
    rarity: Rarity.RARE,
    healthEffect: 15,
    energyEffect: 5,
    imageUrl: '/items/survival-cloak.png',
  },
  {
    name: 'Water Purifier',
    description: 'Portable device that makes any water safe to drink',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.UNCOMMON,
    imageUrl: '/items/water-purifier.png',
  },
  {
    name: 'Cactus Juice',
    description: 'Refreshing desert drink with healing properties',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.UNCOMMON,
    healthEffect: 25,
    energyEffect: 10,
    imageUrl: '/items/cactus-juice.png',
  },
  {
    name: 'Ancient Artifact',
    description: 'Mysterious relic from a lost desert civilization',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.LEGENDARY,
    imageUrl: '/items/ancient-artifact.png',
  },

  // === UNIVERSAL RARE ITEMS ===
  {
    name: 'Golden Pickaxe',
    description: 'Legendary mining tool said to find impossible treasures',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.LEGENDARY,
    durability: 500,
    imageUrl: '/items/golden-pickaxe.png',
  },
  {
    name: 'Wojak Mask',
    description: 'Iconic meme face mask - the ultimate flex',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.FACE_COVERING,
    rarity: Rarity.EPIC,
    imageUrl: '/items/wojak-mask.png',
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
  {
    name: 'Pepe Charm',
    description: 'Rare companion charm - brings good luck in mining',
    category: ItemCategory.ACCESSORY,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    imageUrl: '/items/pepe-charm.png',
  },
  {
    name: 'Super Energy Potion',
    description: 'Ultimate energy restoration - fully charged!',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.EPIC,
    energyEffect: 100, // Full restore
    imageUrl: '/items/super-energy-potion.png',
  },
]

async function addThemedItems() {
  console.log('🎮 Adding themed items to Wojak Earth...')

  try {
    for (const itemData of NEW_ITEMS) {
      // Check if item already exists
      const existingItem = await prisma.item.findUnique({
        where: { name: itemData.name },
      })

      if (existingItem) {
        console.log(`  ⚠️  Item '${itemData.name}' already exists, skipping...`)
        continue
      }

      // Create new item
      await prisma.item.create({
        data: itemData,
      })

      console.log(`  ✨ Added ${itemData.name} (${itemData.rarity})`)
    }

    console.log('\n🎉 Themed items added successfully!')

    // Show summary by category
    const itemsByCategory = NEW_ITEMS.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\n📊 Items Added by Category:')
    Object.entries(itemsByCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} items`)
    })

    // Show summary by rarity
    const itemsByRarity = NEW_ITEMS.reduce((acc, item) => {
      acc[item.rarity] = (acc[item.rarity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\n🌟 Items Added by Rarity:')
    Object.entries(itemsByRarity).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count} items`)
    })
  } catch (error) {
    console.error('❌ Failed to add themed items:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addThemedItems()
