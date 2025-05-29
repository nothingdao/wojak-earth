// scripts/seed-markets.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Market configurations per location
const MARKET_CONFIGS = {
  'Mining Plains': {
    items: [
      { name: 'Miners Hat', quantity: 10, price: 15 },
      { name: 'Work Gloves', quantity: 8, price: 12 },
      { name: 'Energy Drink', quantity: 20, price: 8 },
      { name: 'Dirty Coal', quantity: 50, price: 2 },
      { name: 'Iron Scraps', quantity: 25, price: 5 },
      { name: 'Basic Pickaxe', quantity: 5, price: 20 },
      { name: 'Multi-Tool', quantity: 3, price: 35 },
      { name: 'Repair Kit', quantity: 4, price: 25 },
    ],
  },
  'Central Exchange': {
    items: [
      { name: 'Cyber Jacket', quantity: 3, price: 75 },
      { name: 'Lucky Charm', quantity: 5, price: 30 },
      { name: 'Health Potion', quantity: 15, price: 25 },
      { name: 'Energy Drink', quantity: 25, price: 10 },
      { name: 'Ancient Coin', quantity: 8, price: 100 },
      { name: 'Hacking Toolkit', quantity: 2, price: 120 },
      { name: 'Signal Booster', quantity: 3, price: 80 },
      { name: 'Quantum Processor', quantity: 1, price: 300 },
      { name: 'Scanning Device', quantity: 2, price: 95 },
    ],
  },
  'Desert Outpost': {
    items: [
      { name: 'Work Gloves', quantity: 6, price: 18 },
      { name: 'Energy Drink', quantity: 12, price: 15 }, // Higher prices in remote areas
      { name: 'Health Potion', quantity: 8, price: 35 },
      { name: 'Crystal Shard', quantity: 2, price: 200 },
      { name: 'Survival Knife', quantity: 4, price: 30 },
      { name: 'Fire Starter', quantity: 6, price: 15 },
      { name: 'GPS Tracker', quantity: 2, price: 65 },
    ],
  },
}

async function seedMarkets() {
  console.log('🏪 Starting market seed...')

  try {
    // Get all locations and items for reference
    const locations = await prisma.location.findMany({
      where: { hasMarket: true },
    })

    const items = await prisma.item.findMany()
    const itemMap = new Map(items.map((item) => [item.name, item]))

    for (const location of locations) {
      const config =
        MARKET_CONFIGS[location.name as keyof typeof MARKET_CONFIGS]

      if (!config) {
        console.log(`⚠️  No market config for ${location.name}, skipping...`)
        continue
      }

      console.log(`\n🏪 Restocking ${location.name}...`)

      for (const itemConfig of config.items) {
        const item = itemMap.get(itemConfig.name)

        if (!item) {
          console.log(`  ❌ Item '${itemConfig.name}' not found in database`)
          continue
        }

        // Check if listing already exists
        const existingListing = await prisma.marketListing.findFirst({
          where: {
            locationId: location.id,
            itemId: item.id,
            isSystemItem: true,
          },
        })

        if (existingListing) {
          // Update existing listing
          await prisma.marketListing.update({
            where: { id: existingListing.id },
            data: {
              quantity: itemConfig.quantity,
              price: itemConfig.price,
            },
          })
          console.log(
            `  🔄 Updated ${itemConfig.name}: ${itemConfig.quantity} @ ${itemConfig.price} coins`
          )
        } else {
          // Create new listing
          await prisma.marketListing.create({
            data: {
              locationId: location.id,
              itemId: item.id,
              quantity: itemConfig.quantity,
              price: itemConfig.price,
              isSystemItem: true,
            },
          })
          console.log(
            `  ✨ Added ${itemConfig.name}: ${itemConfig.quantity} @ ${itemConfig.price} coins`
          )
        }
      }
    }

    console.log('\n🎉 Market seed completed successfully!')

    // Show summary
    const totalListings = await prisma.marketListing.count({
      where: { isSystemItem: true },
    })
    console.log(`📊 Total system market listings: ${totalListings}`)
  } catch (error) {
    console.error('❌ Market seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Command line options
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🏪 Market Listing Seed Script

Usage:
  npm run seed:markets              # Restock all markets
  npm run seed:markets --clear      # Clear all system listings first
  npm run seed:markets --location "Central Exchange"  # Restock specific location

Options:
  --clear                           Clear all system listings before restocking
  --location <name>                 Only restock specific location
  --help, -h                        Show this help message
`)
  process.exit(0)
}

// Handle clear option
if (args.includes('--clear')) {
  console.log('🧹 Clearing existing system market listings...')
  await prisma.marketListing.deleteMany({
    where: { isSystemItem: true },
  })
  console.log('✅ Cleared all system listings')
}

// Handle specific location
const locationArg = args.indexOf('--location')
if (locationArg !== -1 && args[locationArg + 1]) {
  const targetLocation = args[locationArg + 1]
  console.log(`🎯 Targeting specific location: ${targetLocation}`)

  // Filter MARKET_CONFIGS to only include the target location
  const filteredConfig = {
    [targetLocation]:
      MARKET_CONFIGS[targetLocation as keyof typeof MARKET_CONFIGS],
  }
  Object.assign(MARKET_CONFIGS, filteredConfig)

  // Clear all other configs
  for (const key in MARKET_CONFIGS) {
    if (key !== targetLocation) {
      delete MARKET_CONFIGS[key as keyof typeof MARKET_CONFIGS]
    }
  }
}

// Run the seed
seedMarkets()
