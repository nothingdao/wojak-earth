// scripts/restock-markets.ts - Selective market restocking without world destruction
import { PrismaClient } from '@prisma/client'
import { applyPriceMultiplier } from '../data/worldConfig'

// example: Restock energy drinks in all markets
// npm run restock energy 50
// npm run restock analyze
// npm run restock full

const prisma = new PrismaClient()

interface RestockConfig {
  itemName: string
  locations: string[]
  quantity: number
  price?: number // Optional - will use existing price if not specified
  mode: 'add' | 'replace' | 'update' // How to handle existing stock
}

// ============================================================================
// RESTOCKING CONFIGURATIONS
// ============================================================================

const RESTOCK_CONFIGS: RestockConfig[] = [
  {
    itemName: 'Energy Drink',
    locations: [
      'Mining Plains',
      'Rusty Pickaxe Inn',
      'Crystal Caves',
      'Central Exchange',
      'The Glitch Club',
      'Desert Outpost',
      'Ironwood Trading Post',
      'Error 404 Oasis',
      'Spore Exchange',
      'Dead Air Tavern',
    ],
    quantity: 25, // Add 25 to each location
    mode: 'add', // Add to existing stock
  },
  // Example: Restock health potions too
  {
    itemName: 'Health Potion',
    locations: [
      'Rusty Pickaxe Inn',
      'Crystal Caves',
      'Desert Outpost',
      'Ironwood Trading Post',
    ],
    quantity: 15,
    mode: 'add',
  },
  // Example: Replace pickaxe stock entirely
  {
    itemName: 'Basic Pickaxe',
    locations: ['Mining Plains', 'Ironwood Trading Post'],
    quantity: 10,
    price: 20, // Override price
    mode: 'replace',
  },
]

// ============================================================================
// RESTOCKING FUNCTIONS
// ============================================================================

async function restockMarkets() {
  console.log('🔄 Starting selective market restocking...')
  console.log('='.repeat(50))

  let totalUpdates = 0
  let totalAdded = 0
  let totalReplaced = 0

  for (const config of RESTOCK_CONFIGS) {
    console.log(`\n📦 Processing ${config.itemName}...`)

    // Find the item
    const item = await prisma.item.findFirst({
      where: { name: config.itemName },
    })

    if (!item) {
      console.log(`  ❌ Item '${config.itemName}' not found`)
      continue
    }

    // Process each location
    for (const locationName of config.locations) {
      const location = await prisma.location.findFirst({
        where: { name: locationName },
      })

      if (!location) {
        console.log(`  ❌ Location '${locationName}' not found`)
        continue
      }

      if (!location.hasMarket) {
        console.log(`  ⚠️  Location '${locationName}' has no market`)
        continue
      }

      // Check for existing listing
      const existingListing = await prisma.marketListing.findFirst({
        where: {
          locationId: location.id,
          itemId: item.id,
          isSystemItem: true,
        },
      })

      const basePrice = config.price || 8 // Default energy drink price
      const adjustedPrice = applyPriceMultiplier(basePrice, locationName)

      if (existingListing) {
        // Handle existing listing based on mode
        switch (config.mode) {
          case 'add':
            await prisma.marketListing.update({
              where: { id: existingListing.id },
              data: {
                quantity: existingListing.quantity + config.quantity,
              },
            })
            console.log(
              `  ✅ Added ${
                config.quantity
              } to existing stock in ${locationName} (total: ${
                existingListing.quantity + config.quantity
              })`
            )
            totalAdded++
            break

          case 'replace':
            await prisma.marketListing.update({
              where: { id: existingListing.id },
              data: {
                quantity: config.quantity,
                price: adjustedPrice,
              },
            })
            console.log(
              `  🔄 Replaced stock in ${locationName} (new quantity: ${config.quantity})`
            )
            totalReplaced++
            break

          case 'update':
            await prisma.marketListing.update({
              where: { id: existingListing.id },
              data: {
                quantity: Math.max(existingListing.quantity, config.quantity),
                price: adjustedPrice,
              },
            })
            console.log(
              `  ⬆️  Updated stock in ${locationName} (quantity: ${Math.max(
                existingListing.quantity,
                config.quantity
              )})`
            )
            totalUpdates++
            break
        }
      } else {
        // Create new listing
        await prisma.marketListing.create({
          data: {
            locationId: location.id,
            itemId: item.id,
            quantity: config.quantity,
            price: adjustedPrice,
            isSystemItem: true,
          },
        })
        console.log(
          `  🆕 Created new listing in ${locationName} (quantity: ${config.quantity}, price: ${adjustedPrice})`
        )
        totalAdded++
      }
    }
  }

  console.log('\n📊 RESTOCKING SUMMARY')
  console.log('='.repeat(50))
  console.log(`📈 Items added: ${totalAdded}`)
  console.log(`🔄 Items replaced: ${totalReplaced}`)
  console.log(`⬆️  Items updated: ${totalUpdates}`)
  console.log(
    `🎯 Total operations: ${totalAdded + totalReplaced + totalUpdates}`
  )
}

// ============================================================================
// SPECIFIC ENERGY DRINK RESTOCKING
// ============================================================================

async function restockEnergyDrinksOnly(quantity: number = 50) {
  console.log(`⚡ Quick-restocking Energy Drinks (+${quantity} each location)`)
  console.log('='.repeat(50))

  const item = await prisma.item.findFirst({
    where: { name: 'Energy Drink' },
  })

  if (!item) {
    console.log('❌ Energy Drink item not found!')
    return
  }

  // Get all market locations
  const marketLocations = await prisma.location.findMany({
    where: { hasMarket: true },
  })

  let restocked = 0

  for (const location of marketLocations) {
    const existingListing = await prisma.marketListing.findFirst({
      where: {
        locationId: location.id,
        itemId: item.id,
        isSystemItem: true,
      },
    })

    const adjustedPrice = applyPriceMultiplier(8, location.name) // Base price 8

    if (existingListing) {
      // Add to existing stock
      await prisma.marketListing.update({
        where: { id: existingListing.id },
        data: {
          quantity: existingListing.quantity + quantity,
        },
      })
      console.log(
        `  ✅ ${location.name}: ${existingListing.quantity} → ${
          existingListing.quantity + quantity
        }`
      )
    } else {
      // Create new listing
      await prisma.marketListing.create({
        data: {
          locationId: location.id,
          itemId: item.id,
          quantity: quantity,
          price: adjustedPrice,
          isSystemItem: true,
        },
      })
      console.log(`  🆕 ${location.name}: Created with ${quantity} drinks`)
    }
    restocked++
  }

  console.log(`\n✅ Restocked Energy Drinks in ${restocked} locations`)
}

// ============================================================================
// MARKET ANALYSIS TOOLS
// ============================================================================

async function analyzeCurrentStock() {
  console.log('📊 CURRENT MARKET ANALYSIS')
  console.log('='.repeat(50))

  const marketListings = await prisma.marketListing.findMany({
    where: { isSystemItem: true },
    include: {
      item: true,
      location: true,
    },
    orderBy: [{ item: { name: 'asc' } }, { location: { name: 'asc' } }],
  })

  // Group by item
  const itemStock = new Map<
    string,
    Array<{ location: string; quantity: number; price: number }>
  >()

  for (const listing of marketListings) {
    const itemName = listing.item.name
    if (!itemStock.has(itemName)) {
      itemStock.set(itemName, [])
    }
    itemStock.get(itemName)!.push({
      location: listing.location.name,
      quantity: listing.quantity,
      price: listing.price,
    })
  }

  // Display analysis
  for (const [itemName, locations] of itemStock) {
    const totalStock = locations.reduce((sum, loc) => sum + loc.quantity, 0)
    const avgPrice = Math.round(
      locations.reduce((sum, loc) => sum + loc.price, 0) / locations.length
    )

    console.log(`\n📦 ${itemName}:`)
    console.log(
      `   Total Stock: ${totalStock} across ${locations.length} locations`
    )
    console.log(`   Average Price: ${avgPrice} coins`)

    if (totalStock < 10) {
      console.log(`   ⚠️  LOW STOCK WARNING`)
    }

    // Show top 3 locations by stock
    const topLocations = locations
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)

    topLocations.forEach((loc, i) => {
      console.log(
        `   ${i + 1}. ${loc.location}: ${loc.quantity} @ ${loc.price}c`
      )
    })
  }
}

// ============================================================================
// MAIN EXECUTION OPTIONS
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'energy'

  try {
    switch (command) {
      case 'energy': {
        const quantity = parseInt(args[1]) || 50
        await restockEnergyDrinksOnly(quantity)
        break
      }

      case 'full': {
        await restockMarkets()
        break
      }

      case 'analyze': {
        await analyzeCurrentStock()
        break
      }

      default: {
        console.log('📋 Available commands:')
        console.log(
          '  npm run restock energy [quantity]  - Restock energy drinks (default: 50)'
        )
        console.log(
          '  npm run restock full              - Run full restocking config'
        )
        console.log(
          '  npm run restock analyze           - Analyze current market stock'
        )
        break
      }
    }
  } catch (error) {
    console.error('❌ Restocking failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { restockMarkets, restockEnergyDrinksOnly, analyzeCurrentStock }
