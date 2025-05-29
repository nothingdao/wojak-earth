// scripts/fix-market-locations.ts - Fix market settings
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMarketLocations() {
  console.log('🔧 Fixing market location settings...\n')

  try {
    // Enable markets for locations that should have them
    const locationsToEnableMarkets = [
      'Crystal Caves', // Should have a market
      'The Glitch Club', // Should have a market
      'Cyber City',
    ]

    // Disable markets for locations that shouldn't have them
    const locationsToDisableMarkets = [
      // 'Cyber City', // Parent location - markets are in sub-locations
    ]

    console.log('✅ ENABLING MARKETS:')
    for (const locationName of locationsToEnableMarkets) {
      const result = await prisma.location.updateMany({
        where: { name: locationName },
        data: { hasMarket: true },
      })

      if (result.count > 0) {
        console.log(`  🏪 ${locationName} - market enabled`)
      } else {
        console.log(`  ❌ ${locationName} - location not found`)
      }
    }

    console.log('\n❌ DISABLING MARKETS:')
    for (const locationName of locationsToDisableMarkets) {
      const result = await prisma.location.updateMany({
        where: { name: locationName },
        data: { hasMarket: false },
      })

      if (result.count > 0) {
        console.log(
          `  🚫 ${locationName} - market disabled (use sub-locations instead)`
        )
      } else {
        console.log(`  ❌ ${locationName} - location not found`)
      }
    }

    console.log('\n🔍 UPDATED MARKET LOCATIONS:')
    const marketLocations = await prisma.location.findMany({
      where: { hasMarket: true },
      orderBy: [{ parentLocationId: 'asc' }, { name: 'asc' }],
    })

    marketLocations.forEach((location) => {
      const isParent = !location.parentLocationId
      const parentIcon = isParent ? '🏛️' : '  └─'
      console.log(`${parentIcon} ${location.name} (${location.locationType})`)
    })

    console.log(`\n📊 Total market locations: ${marketLocations.length}`)

    // Check if we have configs for all market locations
    const MARKET_CONFIG_NAMES = [
      'Mining Plains',
      'Central Exchange',
      'Desert Outpost',
      'The Glitch Club',
      'Rusty Pickaxe Inn',
      'Crystal Caves',
      'Cyber City', // Added parent location config
    ]

    console.log('\n🎯 MARKET CONFIG COVERAGE:')
    marketLocations.forEach((location) => {
      const hasConfig = MARKET_CONFIG_NAMES.includes(location.name)
      const configIcon = hasConfig ? '✅' : '❌'
      console.log(`  ${configIcon} ${location.name}`)
    })

    console.log('\n✨ Market location settings fixed!')
  } catch (error) {
    console.error('❌ Fix failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixMarketLocations()
