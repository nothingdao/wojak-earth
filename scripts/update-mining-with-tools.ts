// scripts/update-mining-with-tools.ts - Add new tools to mining locations
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Additional mining resources with new tools
const TOOL_MINING_CONFIGS = {
  'Mining Plains': [
    { name: 'Basic Pickaxe', spawnRate: 0.08, maxPerDay: 3, difficulty: 1 },
    { name: 'Multi-Tool', spawnRate: 0.05, maxPerDay: 2, difficulty: 1 },
    { name: 'Repair Kit', spawnRate: 0.04, maxPerDay: 2, difficulty: 1 },
  ],

  'Crystal Caves': [
    { name: 'Drill Hammer', spawnRate: 0.03, maxPerDay: 1, difficulty: 3 },
    { name: 'Scanning Device', spawnRate: 0.02, maxPerDay: 1, difficulty: 3 },
    { name: 'Laser Cutter', spawnRate: 0.015, maxPerDay: 1, difficulty: 4 },
    { name: 'Omni-Tool', spawnRate: 0.002, maxPerDay: 1, difficulty: 5 }, // Ultra rare
  ],

  'Desert Outpost': [
    { name: 'Survival Knife', spawnRate: 0.06, maxPerDay: 2, difficulty: 2 },
    { name: 'Fire Starter', spawnRate: 0.05, maxPerDay: 3, difficulty: 1 },
    { name: 'GPS Tracker', spawnRate: 0.03, maxPerDay: 1, difficulty: 2 },
  ],

  'Central Exchange': [
    { name: 'Hacking Toolkit', spawnRate: 0.02, maxPerDay: 1, difficulty: 4 },
    { name: 'Signal Booster', spawnRate: 0.04, maxPerDay: 2, difficulty: 3 },
    {
      name: 'Quantum Processor',
      spawnRate: 0.008,
      maxPerDay: 1,
      difficulty: 4,
    },
  ],

  'The Glitch Club': [
    { name: 'Hacking Toolkit', spawnRate: 0.035, maxPerDay: 2, difficulty: 3 }, // Better in underground
    { name: 'Reality Wrench', spawnRate: 0.001, maxPerDay: 1, difficulty: 5 }, // Legendary find
  ],
}

async function updateMiningWithTools() {
  console.log('🔧 Adding new tools to mining locations...')

  try {
    const locations = await prisma.location.findMany({
      where: { hasMining: true },
    })

    const items = await prisma.item.findMany()
    const itemMap = new Map(items.map((item) => [item.name, item]))

    let totalResourcesAdded = 0

    for (const location of locations) {
      const toolConfigs =
        TOOL_MINING_CONFIGS[location.name as keyof typeof TOOL_MINING_CONFIGS]

      if (!toolConfigs) {
        continue // Skip locations without tool configs
      }

      console.log(`\n🔧 Adding tools to ${location.name}...`)

      for (const toolConfig of toolConfigs) {
        const item = itemMap.get(toolConfig.name)

        if (!item) {
          console.log(`  ❌ Tool '${toolConfig.name}' not found in database`)
          continue
        }

        // Check if resource already exists
        const existingResource = await prisma.locationResource.findUnique({
          where: {
            locationId_itemId: {
              locationId: location.id,
              itemId: item.id,
            },
          },
        })

        if (existingResource) {
          console.log(
            `  ⚠️  ${toolConfig.name} already configured for this location`
          )
          continue
        }

        // Create new resource
        await prisma.locationResource.create({
          data: {
            locationId: location.id,
            itemId: item.id,
            spawnRate: toolConfig.spawnRate,
            maxPerDay: toolConfig.maxPerDay,
            difficulty: toolConfig.difficulty,
          },
        })

        console.log(
          `  ✨ Added ${toolConfig.name}: ${(
            toolConfig.spawnRate * 100
          ).toFixed(1)}% spawn`
        )
        totalResourcesAdded++
      }
    }

    console.log(
      `\n🎉 Tool mining resources added! Added ${totalResourcesAdded} new tool nodes`
    )

    // Show ultra-rare tool finds
    console.log('\n⭐ Ultra-Rare Tool Finds:')
    const rareToolResources = await prisma.locationResource.findMany({
      where: {
        spawnRate: { lt: 0.01 },
        item: { category: 'TOOL' },
      },
      include: {
        item: true,
        location: true,
      },
      orderBy: { spawnRate: 'asc' },
    })

    rareToolResources.forEach((resource) => {
      console.log(
        `  🔧 ${resource.item.name} in ${resource.location.name}: ${(
          resource.spawnRate * 100
        ).toFixed(2)}% chance`
      )
    })

    // Show total tool mining nodes
    const totalToolNodes = await prisma.locationResource.count({
      where: {
        item: { category: 'TOOL' },
      },
    })

    console.log(`\n📊 Total tool mining nodes: ${totalToolNodes}`)
  } catch (error) {
    console.error('❌ Failed to update mining with tools:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

updateMiningWithTools()
