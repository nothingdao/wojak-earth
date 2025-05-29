// scripts/seed-enhanced-markets.ts - Complete version with ALL locations
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Enhanced market configurations with new themed items - ALL LOCATIONS COVERED
const ENHANCED_MARKET_CONFIGS = {
  'Mining Plains': {
    items: [
      // Basic mining gear (cheap and common)
      { name: 'Miners Hat', quantity: 8, price: 15 },
      { name: 'Work Gloves', quantity: 6, price: 12 },
      { name: 'Safety Goggles', quantity: 5, price: 8 },
      { name: 'Heavy Duty Boots', quantity: 3, price: 25 },

      // Consumables
      { name: 'Energy Drink', quantity: 15, price: 8 },
      { name: 'Protein Bar', quantity: 12, price: 6 },

      // Materials (system buys these from players too)
      { name: 'Dirty Coal', quantity: 30, price: 2 },
      { name: 'Iron Scraps', quantity: 20, price: 4 },
      { name: 'Rare Earth Metal', quantity: 5, price: 15 },

      // Rare equipment occasionally available
      { name: 'Reinforced Pickaxe', quantity: 1, price: 120 },

      { name: 'Basic Pickaxe', quantity: 5, price: 20 },
      { name: 'Multi-Tool', quantity: 3, price: 35 },
      { name: 'Repair Kit', quantity: 4, price: 25 },
    ],
  },

  'Central Exchange': {
    items: [
      // High-tech gear
      { name: 'Cyber Jacket', quantity: 2, price: 85 },
      { name: 'Cyberpunk Shades', quantity: 3, price: 65 },
      { name: 'Neon Visor', quantity: 1, price: 150 },
      { name: 'Data Spike', quantity: 2, price: 95 },

      // Premium consumables
      { name: 'Health Potion', quantity: 10, price: 25 },
      { name: 'Code Energy Drink', quantity: 8, price: 18 },
      { name: 'Super Energy Potion', quantity: 2, price: 180 }, // Epic consumable

      // Digital materials
      { name: 'Bitcoin Fragment', quantity: 4, price: 45 },
      { name: 'Ancient Coin', quantity: 6, price: 35 },

      // Ultra rare items (very limited stock)
      { name: 'Rare Floppy Disk', quantity: 1, price: 500 }, // Legendary item
      { name: 'Rainbow Hoodie', quantity: 1, price: 200 },

      { name: 'Hacking Toolkit', quantity: 2, price: 120 },
      { name: 'Signal Booster', quantity: 3, price: 80 },
      { name: 'Quantum Processor', quantity: 1, price: 300 },
      { name: 'Scanning Device', quantity: 2, price: 95 },
    ],
  },

  'Desert Outpost': {
    items: [
      // Survival gear (higher prices due to remote location)
      { name: 'Desert Wrap', quantity: 4, price: 35 },
      { name: 'Survival Cloak', quantity: 2, price: 120 },
      { name: 'Water Purifier', quantity: 3, price: 55 },

      // Desert consumables
      { name: 'Cactus Juice', quantity: 8, price: 20 },
      { name: 'Energy Drink', quantity: 6, price: 15 }, // More expensive here
      { name: 'Health Potion', quantity: 4, price: 35 },

      // Desert specialties
      { name: 'Ancient Coin', quantity: 12, price: 25 }, // Cheaper here (local specialty)
      { name: 'Crystal Shard', quantity: 3, price: 80 },

      // Ultra rare desert find
      { name: 'Ancient Artifact', quantity: 1, price: 1000 }, // Legendary desert item

      { name: 'Survival Knife', quantity: 4, price: 30 },
      { name: 'Fire Starter', quantity: 6, price: 15 },
      { name: 'GPS Tracker', quantity: 2, price: 65 },
    ],
  },

  'The Glitch Club': {
    items: [
      // Underground hacker gear
      { name: 'Cyberpunk Shades', quantity: 4, price: 55 }, // Cheaper in underground
      { name: 'Neon Visor', quantity: 2, price: 130 },
      { name: 'Data Spike', quantity: 3, price: 85 },

      // Meme culture items
      { name: 'Wojak Mask', quantity: 1, price: 250 }, // Epic meme item
      { name: 'Pepe Charm', quantity: 2, price: 75 },
      { name: 'Rainbow Hoodie', quantity: 1, price: 180 },

      // Hacker consumables
      { name: 'Code Energy Drink', quantity: 12, price: 15 }, // Club specialty
      { name: 'Super Energy Potion', quantity: 1, price: 160 },

      // Digital contraband
      { name: 'Bitcoin Fragment', quantity: 6, price: 40 }, // Better price underground
      { name: 'Rare Floppy Disk', quantity: 1, price: 450 }, // Slightly cheaper than exchange

      // Lucky charms
      { name: 'Lucky Charm', quantity: 3, price: 30 },

      { name: 'Hacking Toolkit', quantity: 3, price: 100 }, // Cheaper underground
      { name: 'Multi-Tool', quantity: 4, price: 30 },

      { name: 'Reality Wrench', quantity: 1, price: 4000 },
    ],
  },

  'Rusty Pickaxe Inn': {
    items: [
      // Tavern basics
      { name: 'Energy Drink', quantity: 20, price: 10 },
      { name: 'Health Potion', quantity: 15, price: 22 },
      { name: 'Protein Bar', quantity: 25, price: 5 },

      // Basic gear for newbies
      { name: 'Miners Hat', quantity: 10, price: 12 }, // Cheaper at the inn
      { name: 'Work Gloves', quantity: 8, price: 10 },
      { name: 'Safety Goggles', quantity: 6, price: 6 },

      // Tavern specials
      { name: 'Lucky Charm', quantity: 4, price: 28 },
      { name: 'Pepe Charm', quantity: 1, price: 65 }, // Rare tavern find

      // Materials (inn keeper buys from miners)
      { name: 'Dirty Coal', quantity: 50, price: 1 }, // Cheap bulk buy
      { name: 'Iron Scraps', quantity: 30, price: 3 },

      { name: 'Basic Pickaxe', quantity: 8, price: 18 }, // Slightly cheaper
      { name: 'Multi-Tool', quantity: 5, price: 32 },
      { name: 'Repair Kit', quantity: 6, price: 22 },
    ],
  },

  'Crystal Caves': {
    items: [
      // Specialized mining equipment
      { name: 'Reinforced Pickaxe', quantity: 2, price: 100 }, // Better price in caves
      { name: 'Safety Goggles', quantity: 8, price: 10 },
      { name: 'Heavy Duty Boots', quantity: 3, price: 22 },

      // Cave-specific consumables
      { name: 'Energy Drink', quantity: 12, price: 12 },
      { name: 'Health Potion', quantity: 8, price: 28 },

      // Crystal trade
      { name: 'Crystal Shard', quantity: 8, price: 50 }, // Cave specialty
      { name: 'Ancient Coin', quantity: 4, price: 40 },

      // Ultra rare mining tool
      { name: 'Golden Pickaxe', quantity: 1, price: 2500 }, // Legendary mining tool

      { name: 'Drill Hammer', quantity: 2, price: 90 },
      { name: 'Laser Cutter', quantity: 1, price: 180 },
      { name: 'Scanning Device', quantity: 3, price: 85 }, // Better price in caves

      { name: 'Omni-Tool', quantity: 1, price: 3500 },
    ],
  },

  // Parent location config (basic urban supplies)
  'Cyber City': {
    items: [
      // Basic urban supplies - encourage users to visit specialized sub-locations
      { name: 'Energy Drink', quantity: 10, price: 15 },
      { name: 'Health Potion', quantity: 8, price: 30 },
      { name: 'Code Energy Drink', quantity: 5, price: 20 },
      { name: 'Lucky Charm', quantity: 2, price: 35 },

      // Note: Best items are in Central Exchange and Glitch Club
    ],
  },
}

async function seedEnhancedMarkets() {
  console.log('🏪 Starting enhanced market seed with new themed items...')

  try {
    // Get all locations that have markets (including sub-locations)
    const locations = await prisma.location.findMany({
      where: { hasMarket: true },
    })

    const items = await prisma.item.findMany()
    const itemMap = new Map(items.map((item) => [item.name, item]))

    console.log(`📍 Found ${locations.length} market locations`)
    console.log(`📦 Found ${items.length} items available`)

    // Filter locations to only those we have configs for
    const configuredLocations = locations.filter((location) =>
      ENHANCED_MARKET_CONFIGS.hasOwnProperty(location.name)
    )

    console.log(
      `🎯 Processing ${configuredLocations.length} configured market locations:`
    )
    configuredLocations.forEach((loc) => console.log(`   • ${loc.name}`))

    if (configuredLocations.length !== locations.length) {
      const unconfiguredLocations = locations.filter(
        (location) => !ENHANCED_MARKET_CONFIGS.hasOwnProperty(location.name)
      )
      console.log(
        `⚠️  Skipping ${unconfiguredLocations.length} unconfigured locations:`
      )
      unconfiguredLocations.forEach((loc) =>
        console.log(`   • ${loc.name} (no market config)`)
      )
    }

    let totalListingsCreated = 0
    let totalListingsUpdated = 0

    for (const location of configuredLocations) {
      const config =
        ENHANCED_MARKET_CONFIGS[
          location.name as keyof typeof ENHANCED_MARKET_CONFIGS
        ]

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
          totalListingsUpdated++
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
          totalListingsCreated++
        }
      }
    }

    console.log('\n🎉 Enhanced market seed completed successfully!')
    console.log(
      `📊 Created ${totalListingsCreated} new listings, updated ${totalListingsUpdated} existing`
    )

    // Show summary by location
    console.log('\n🏪 Market Summary by Location:')
    for (const location of configuredLocations) {
      const locationListings = await prisma.marketListing.count({
        where: {
          locationId: location.id,
          isSystemItem: true,
        },
      })

      if (locationListings > 0) {
        console.log(`  ${location.name}: ${locationListings} items available`)
      }
    }

    // Show legendary/epic items available
    console.log('\n⭐ Premium Items Available:')
    const premiumListings = await prisma.marketListing.findMany({
      where: {
        isSystemItem: true,
        item: {
          rarity: {
            in: ['EPIC', 'LEGENDARY'],
          },
        },
      },
      include: {
        item: true,
        location: true,
      },
      orderBy: { price: 'desc' },
    })

    premiumListings.forEach((listing) => {
      console.log(
        `  ${listing.item.name} (${listing.item.rarity}) - ${listing.price} coins at ${listing.location.name}`
      )
    })

    // Show total market value
    const totalMarketValue = await prisma.marketListing.aggregate({
      where: { isSystemItem: true },
      _sum: {
        price: true,
      },
    })

    console.log(
      `\n💰 Total Market Value: ${totalMarketValue._sum.price || 0} coins`
    )
  } catch (error) {
    console.error('❌ Enhanced market seed failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Command line options
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🏪 Enhanced Market Seeding Script

Usage:
  npm run seed:enhanced-markets          # Restock all markets with new items
  npm run seed:enhanced-markets --clear  # Clear all system listings first
  npm run seed:enhanced-markets --location "Central Exchange"  # Specific location

Features:
  ✨ All 7 locations covered with themed items
  💰 Location-appropriate pricing strategy
  🎯 Rarity-based availability system
  🏪 Each location has unique specialties

Locations Covered:
  🏭 Mining Plains - Industrial mining gear
  🏢 Central Exchange - High-tech cyber gear + legendaries
  🏜️ Desert Outpost - Survival gear + ancient artifacts
  🎮 The Glitch Club - Underground hacker gear + memes
  🍺 Rusty Pickaxe Inn - Newbie basics + tavern specials
  💎 Crystal Caves - Professional mining tools
  🏙️ Cyber City - Basic urban supplies

Premium Items:
  🔥 Golden Pickaxe (2500 coins at Crystal Caves)
  💾 Rare Floppy Disk (500 coins at Central Exchange)
  🏺 Ancient Artifact (1000 coins at Desert Outpost)
  🌈 Rainbow Hoodie (200 coins at Central Exchange)
  🎭 Wojak Mask (250 coins at The Glitch Club)
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

  // Filter configs to only include the target location
  const filteredConfig = {
    [targetLocation]:
      ENHANCED_MARKET_CONFIGS[
        targetLocation as keyof typeof ENHANCED_MARKET_CONFIGS
      ],
  }

  if (!filteredConfig[targetLocation]) {
    console.error(`❌ No market config found for location: ${targetLocation}`)
    console.log(
      'Available locations:',
      Object.keys(ENHANCED_MARKET_CONFIGS).join(', ')
    )
    process.exit(1)
  }

  // Clear all other configs
  Object.keys(ENHANCED_MARKET_CONFIGS).forEach((key) => {
    if (key !== targetLocation) {
      delete ENHANCED_MARKET_CONFIGS[
        key as keyof typeof ENHANCED_MARKET_CONFIGS
      ]
    }
  })
}

// Run the seed
seedEnhancedMarkets()
