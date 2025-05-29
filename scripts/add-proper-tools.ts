// scripts/add-proper-tools.ts - Add more diverse tool items
import { PrismaClient, ItemCategory, LayerType, Rarity } from '@prisma/client'

const prisma = new PrismaClient()

const TOOL_ITEMS = [
  // === MINING TOOLS ===
  {
    name: 'Basic Pickaxe',
    description: 'Standard mining tool for beginners',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY, // Tools render as accessories for now
    rarity: Rarity.COMMON,
    durability: 50,
    imageUrl: '/items/basic-pickaxe.png',
  },
  {
    name: 'Drill Hammer',
    description: 'Pneumatic drilling tool for tough rocks',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.UNCOMMON,
    durability: 120,
    energyEffect: -5, // Tools can cost energy to use
    imageUrl: '/items/drill-hammer.png',
  },
  {
    name: 'Laser Cutter',
    description: 'High-tech precision cutting tool',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 80,
    energyEffect: -10, // High energy cost
    imageUrl: '/items/laser-cutter.png',
  },

  // === UTILITY TOOLS ===
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
    name: 'Repair Kit',
    description: 'Essential tool for fixing equipment on the go',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.UNCOMMON,
    durability: 25, // Limited uses
    imageUrl: '/items/repair-kit.png',
  },
  {
    name: 'Scanning Device',
    description: 'Detects rare materials and hidden resources',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.RARE,
    durability: 200,
    energyEffect: -3, // Small energy cost per scan
    imageUrl: '/items/scanning-device.png',
  },

  // === CYBER TOOLS ===
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
    name: 'Signal Booster',
    description: 'Amplifies wireless connections and data transfers',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.UNCOMMON,
    durability: 300,
    energyEffect: 5, // Boosts energy regeneration
    imageUrl: '/items/signal-booster.png',
  },
  {
    name: 'Quantum Processor',
    description: 'Cutting-edge computing tool for complex calculations',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.EPIC,
    durability: 100,
    energyEffect: 15, // Major energy boost
    imageUrl: '/items/quantum-processor.png',
  },

  // === SURVIVAL TOOLS ===
  {
    name: 'Survival Knife',
    description: 'Multipurpose blade for harsh environments',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.COMMON,
    durability: 200,
    healthEffect: 5, // Provides some protection
    imageUrl: '/items/survival-knife.png',
  },
  {
    name: 'Fire Starter',
    description: 'Reliable ignition tool for cold nights',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.COMMON,
    durability: 50,
    imageUrl: '/items/fire-starter.png',
  },
  {
    name: 'GPS Tracker',
    description: 'Never get lost in the wilderness again',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.UNCOMMON,
    durability: 500, // Long-lasting
    imageUrl: '/items/gps-tracker.png',
  },

  // === LEGENDARY TOOLS ===
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
  {
    name: 'Reality Wrench',
    description: 'Tool so advanced it seems to bend the laws of physics',
    category: ItemCategory.TOOL,
    layerType: LayerType.ACCESSORY,
    rarity: Rarity.LEGENDARY,
    durability: 777,
    energyEffect: 25,
    imageUrl: '/items/reality-wrench.png',
  },
]

async function addProperTools() {
  console.log('🔧 Adding proper tool items to Wojak Earth...')

  try {
    let toolsAdded = 0

    for (const toolData of TOOL_ITEMS) {
      // Check if tool already exists
      const existingTool = await prisma.item.findUnique({
        where: { name: toolData.name },
      })

      if (existingTool) {
        console.log(`  ⚠️  Tool '${toolData.name}' already exists, skipping...`)
        continue
      }

      // Create new tool
      await prisma.item.create({
        data: toolData,
      })

      console.log(`  🔧 Added ${toolData.name} (${toolData.rarity})`)
      toolsAdded++
    }

    console.log('\n🎉 Tool items added successfully!')
    console.log(`📊 Added ${toolsAdded} new tools`)

    // Show summary by rarity
    const toolsByRarity = TOOL_ITEMS.reduce((acc, tool) => {
      const rarity = tool.rarity.toString()
      acc[rarity] = (acc[rarity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\n🌟 Tools Added by Rarity:')
    Object.entries(toolsByRarity).forEach(([rarity, count]) => {
      console.log(`  ${rarity}: ${count} tools`)
    })

    // Show tool categories
    console.log('\n🔧 Tool Categories:')
    console.log('  ⛏️  Mining Tools: Basic Pickaxe, Drill Hammer, Laser Cutter')
    console.log('  🛠️  Utility Tools: Multi-Tool, Repair Kit, Scanning Device')
    console.log(
      '  💻 Cyber Tools: Hacking Toolkit, Signal Booster, Quantum Processor'
    )
    console.log(
      '  🏕️  Survival Tools: Survival Knife, Fire Starter, GPS Tracker'
    )
    console.log('  ⭐ Legendary: Omni-Tool, Reality Wrench')

    console.log('\n💡 Next Steps:')
    console.log(
      '  1. Run npm run update:mining to add tools to mining locations'
    )
    console.log(
      '  2. Run npm run seed:enhanced-markets to add tools to markets'
    )
    console.log('  3. Tools will appear in the TOOL equipment slot!')
  } catch (error) {
    console.error('❌ Failed to add tool items:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addProperTools()
