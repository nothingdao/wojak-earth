// scripts/debug-market-locations.ts - Check which locations have markets
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugMarketLocations() {
  console.log('🔍 Debugging market locations...\n')

  try {
    const allLocations = await prisma.location.findMany({
      orderBy: [{ parentLocationId: 'asc' }, { name: 'asc' }],
    })

    const marketLocations = await prisma.location.findMany({
      where: { hasMarket: true },
      orderBy: [{ parentLocationId: 'asc' }, { name: 'asc' }],
    })

    console.log('📍 ALL LOCATIONS:')
    allLocations.forEach((location) => {
      const isParent = !location.parentLocationId
      const hasMarket = location.hasMarket
      const marketIcon = hasMarket ? '🏪' : '❌'
      const parentIcon = isParent ? '🏛️' : '  └─'

      console.log(
        `${parentIcon} ${marketIcon} ${location.name} (${location.locationType})`
      )
    })

    console.log('\n🏪 MARKET LOCATIONS ONLY:')
    marketLocations.forEach((location) => {
      const isParent = !location.parentLocationId
      const parentIcon = isParent ? '🏛️' : '  └─'
      console.log(`${parentIcon} ${location.name} (${location.locationType})`)
    })

    console.log('\n📊 SUMMARY:')
    console.log(`Total locations: ${allLocations.length}`)
    console.log(`Market locations: ${marketLocations.length}`)

    const parentMarkets = marketLocations.filter((loc) => !loc.parentLocationId)
    const childMarkets = marketLocations.filter((loc) => loc.parentLocationId)

    console.log(`  └─ Parent locations with markets: ${parentMarkets.length}`)
    console.log(`  └─ Sub-locations with markets: ${childMarkets.length}`)

    // Check existing market listings
    const existingListings = await prisma.marketListing.count({
      where: { isSystemItem: true },
    })

    console.log(`\n💰 EXISTING MARKET DATA:`)
    console.log(`System market listings: ${existingListings}`)

    if (existingListings > 0) {
      const listingsByLocation = await prisma.marketListing.groupBy({
        by: ['locationId'],
        where: { isSystemItem: true },
        _count: { id: true },
      })

      for (const group of listingsByLocation) {
        const location = await prisma.location.findUnique({
          where: { id: group.locationId },
        })
        console.log(`  └─ ${location?.name}: ${group._count.id} items`)
      }
    }
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugMarketLocations()
