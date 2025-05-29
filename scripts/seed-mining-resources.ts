// scripts/seed-mining-resources.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mining resource configurations per location
const MINING_CONFIGS = {
  'Mining Plains': {
    resources: [
      { name: 'Dirty Coal', spawnRate: 0.6, maxPerDay: 25, difficulty: 1 },
      { name: 'Iron Scraps', spawnRate: 0.4, maxPerDay: 15, difficulty: 1 },
      { name: 'Ancient Coin', spawnRate: 0.05, maxPerDay: 2, difficulty: 1 }, // Rare find
    ],
  },
  'Crystal Caves': {
    resources: [
      { name: 'Crystal Shard', spawnRate: 0.15, maxPerDay: 5, difficulty: 3 },
      { name: 'Iron Scraps', spawnRate: 0.3, maxPerDay: 8, difficulty: 2 },
      { name: 'Ancient Coin', spawnRate: 0.08, maxPerDay: 3, difficulty: 2 },
    ],
  },
  'Desert Outpost': {
    resources: [
      { name: 'Ancient Coin', spawnRate: 0.2, maxPerDay: 8, difficulty: 3 }, // Desert specialty
      { name: 'Crystal Shard', spawnRate: 0.08, maxPerDay: 2, difficulty: 4 }, // Very rare
      { name: 'Iron Scraps', spawnRate: 0.25, maxPerDay: 6, difficulty: 3 },
    ],
  },
  // Sub-locations get their own resources too
  'Rusty Pickaxe Inn': {
    resources: [
      { name: 'Dirty Coal', spawnRate: 0.3, maxPerDay: 5, difficulty: 1 }, // Limited indoor mining
    ],
  },
}

async function seedMiningResources() {
  console.log('⛏️  Starting mining resources seed...')

  try {
    // Get all locations and items for reference
    const locations = await prisma.location.findMany({
      where: { hasMining: true },
    })

    const items = await prisma.item.findMany()
    const itemMap = new Map(items.map((item) => [item.name, item]))

    console.log(`📍 Found ${locations.length} minable locations`)
    console.log(`📦 Found ${items.length} items in database`)

    for (const location of locations) {
      const config =
        MINING_CONFIGS[location.name as keyof typeof MINING_CONFIGS]

      if (!config) {
        console.log(`⚠️  No mining config for ${location.name}, skipping...`)
        continue
      }

      console.log(`\n⛏️  Setting up mining resources for ${location.name}...`)

      for (const resourceConfig of config.resources) {
        const item = itemMap.get(resourceConfig.name)

        if (!item) {
          console.log(
            `  ❌ Item '${resourceConfig.name}' not found in database`
          )
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
          // Update existing resource
          await prisma.locationResource.update({
            where: { id: existingResource.id },
            data: {
              spawnRate: resourceConfig.spawnRate,
              maxPerDay: resourceConfig.maxPerDay,
              difficulty: resourceConfig.difficulty,
            },
          })
          console.log(
            `  🔄 Updated ${resourceConfig.name}: ${(
              resourceConfig.spawnRate * 100
            ).toFixed(1)}% spawn rate, max ${resourceConfig.maxPerDay}/day`
          )
        } else {
          // Create new resource
          await prisma.locationResource.create({
            data: {
              locationId: location.id,
              itemId: item.id,
              spawnRate: resourceConfig.spawnRate,
              maxPerDay: resourceConfig.maxPerDay,
              difficulty: resourceConfig.difficulty,
            },
          })
          console.log(
            `  ✨ Added ${resourceConfig.name}: ${(
              resourceConfig.spawnRate * 100
            ).toFixed(1)}% spawn rate, max ${resourceConfig.maxPerDay}/day`
          )
        }
      }
    }

    console.log('\n🎉 Mining resources seed completed successfully!')

    // Show summary
    const totalResources = await prisma.locationResource.count()
    console.log(`📊 Total mining resources available: ${totalResources}`)

    // Show resource breakdown by location
    console.log('\n📋 Resource Summary:')
    for (const location of locations) {
      const locationResources = await prisma.locationResource.findMany({
        where: { locationId: location.id },
        include: { item: true },
      })

      if (locationResources.length > 0) {
        console.log(`\n  ${location.name}:`)
        locationResources.forEach((resource) => {
          console.log(
            `    • ${resource.item.name} (${(resource.spawnRate * 100).toFixed(
              1
            )}% chance, ${resource.maxPerDay}/day max)`
          )
        })
      }
    }
  } catch (error) {
    console.error('❌ Mining resources seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Command line options
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
⛏️  Mining Resources Seed Script

Usage:
  npm run seed:mining                    # Setup all mining resources
  npm run seed:mining --clear            # Clear all resources first
  npm run seed:mining --location "Mining Plains"  # Setup specific location

Options:
  --clear                               Clear all location resources first
  --location <name>                     Only setup specific location
  --dry-run                            Show what would be changed without making changes
  --help, -h                           Show this help message

Resource Spawn Rates:
  0.6 = 60% chance (very common)
  0.4 = 40% chance (common)  
  0.2 = 20% chance (uncommon)
  0.1 = 10% chance (rare)
  0.05 = 5% chance (very rare)
`)
  process.exit(0)
}

// Handle clear option
if (args.includes('--clear')) {
  console.log('🧹 Clearing existing mining resources...')
  await prisma.locationResource.deleteMany({})
  console.log('✅ Cleared all mining resources')
}

// Handle dry run
if (args.includes('--dry-run')) {
  console.log('🔍 DRY RUN MODE - No changes will be made')
  // You'd implement dry run logic here
}

// Handle specific location
const locationArg = args.indexOf('--location')
if (locationArg !== -1 && args[locationArg + 1]) {
  const targetLocation = args[locationArg + 1]
  console.log(`🎯 Targeting specific location: ${targetLocation}`)

  // Filter MINING_CONFIGS to only include the target location
  const filteredConfig = {
    [targetLocation]:
      MINING_CONFIGS[targetLocation as keyof typeof MINING_CONFIGS],
  }

  if (!filteredConfig[targetLocation]) {
    console.error(`❌ No mining config found for location: ${targetLocation}`)
    console.log('Available locations:', Object.keys(MINING_CONFIGS).join(', '))
    process.exit(1)
  }

  // Replace the configs with filtered version
  Object.keys(MINING_CONFIGS).forEach((key) => {
    if (key !== targetLocation) {
      delete MINING_CONFIGS[key as keyof typeof MINING_CONFIGS]
    }
  })
}

// Run the seed
seedMiningResources()
