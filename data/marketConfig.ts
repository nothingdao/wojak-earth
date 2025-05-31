// data/marketConfigs.ts - Pure data, no dependencies, safe for browser

export interface MarketItem {
  name: string
  quantity: number
  price: number
}

export interface MarketConfig {
  locationName: string
  items: MarketItem[]
}

export const MARKET_CONFIGS: Record<string, MarketItem[]> = {
  'Mining Plains': [
    { name: 'Miners Hat', quantity: 8, price: 15 },
    { name: 'Basic Pickaxe', quantity: 5, price: 20 },
    { name: 'Multi-Tool', quantity: 3, price: 35 },
    { name: 'Energy Drink', quantity: 15, price: 8 },
    { name: 'Work Gloves', quantity: 6, price: 12 },
  ],

  'Ironwood Trading Post': [
    { name: 'Energy Drink', quantity: 8, price: 12 }, // Expensive due to remote location
    { name: 'Health Potion', quantity: 6, price: 28 }, // Winter survival essentials
    { name: 'Basic Pickaxe', quantity: 4, price: 25 }, // Tools for ice mining
    { name: 'Multi-Tool', quantity: 2, price: 45 }, // Premium survival gear
    { name: 'Work Gloves', quantity: 8, price: 15 }, // Cold weather protection
    { name: 'Frostbite Cloak', quantity: 2, price: 180 }, // Expensive cold weather gear
    { name: 'Ice Walker Boots', quantity: 4, price: 85 }, // Essential for the area
    { name: 'Thermal Undersuit', quantity: 1, price: 350 }, // Premium item, low stock
  ],

  'Rusty Pickaxe Inn': [
    { name: 'Energy Drink', quantity: 20, price: 10 },
    { name: 'Health Potion', quantity: 15, price: 22 },
    { name: 'Basic Pickaxe', quantity: 8, price: 18 },
    { name: 'Lucky Charm', quantity: 4, price: 28 },
  ],

  'Crystal Caves': [
    { name: 'Energy Drink', quantity: 12, price: 12 },
    { name: 'Health Potion', quantity: 8, price: 28 },
    { name: 'Crystal Shard', quantity: 8, price: 50 },
    { name: 'Omni-Tool', quantity: 1, price: 3500 },
  ],

  'Central Exchange': [
    { name: 'Cyberpunk Shades', quantity: 3, price: 65 },
    { name: 'Neon Visor', quantity: 1, price: 150 },
    { name: 'Hacking Toolkit', quantity: 2, price: 120 },
    { name: 'Rare Floppy Disk', quantity: 1, price: 500 },
    { name: 'Cyber Jacket', quantity: 2, price: 85 },
    { name: 'Neural Interface Crown', quantity: 1, price: 2500 }, // Ultra rare tech
    { name: 'Data Armor Plating', quantity: 2, price: 800 }, // High-end cyber gear
  ],

  'The Glitch Club': [
    { name: 'Cyberpunk Shades', quantity: 4, price: 55 },
    { name: 'Hacking Toolkit', quantity: 3, price: 100 },
    { name: 'Multi-Tool', quantity: 4, price: 30 },
  ],

  'Desert Outpost': [
    { name: 'Desert Wrap', quantity: 4, price: 35 },
    { name: 'Energy Drink', quantity: 6, price: 15 },
    { name: 'Health Potion', quantity: 4, price: 35 },
    { name: 'Ancient Artifact', quantity: 1, price: 1000 },
    { name: 'Sandstorm Goggles', quantity: 6, price: 45 }, // Common desert necessity
    { name: 'Heat Dispersal Vest', quantity: 3, price: 120 }, // Rare but needed
  ],

  'The Glitch Wastes': [
    { name: 'Glitch Goggles', quantity: 2, price: 120 },
    { name: 'Buffer Overflow Potion', quantity: 1, price: 200 },
    { name: 'Pixel Dust', quantity: 15, price: 8 },
    { name: 'Fragmented Code', quantity: 5, price: 45 },
  ],

  'Fungi Networks': [
    { name: 'Symbiotic Armor', quantity: 1, price: 300 },
    { name: 'Neural Spores', quantity: 12, price: 25 },
    { name: 'Mycelium Thread', quantity: 20, price: 5 },
  ],

  'Temporal Rift Zone': [
    { name: 'Paradox Engine', quantity: 1, price: 5000 },
    { name: 'Temporal Flux', quantity: 2, price: 1000 },
    { name: 'Causality Loop', quantity: 3, price: 400 },
  ],

  'The Bone Markets': [
    { name: 'Living Bone Tools', quantity: 4, price: 160 },
    { name: 'Skeletal Framework', quantity: 2, price: 220 },
    { name: 'Calcium Crystals', quantity: 20, price: 15 },
  ],

  'Static Fields': [
    { name: 'Signal Booster Helmet', quantity: 2, price: 180 },
    { name: 'White Noise Generator', quantity: 3, price: 130 },
    { name: 'Frequency Modulator', quantity: 2, price: 200 },
    { name: 'Static Cling', quantity: 25, price: 6 },
  ],
}

// Helper functions
export function getMarketConfigForLocation(locationName: string): MarketItem[] {
  return MARKET_CONFIGS[locationName] || []
}

export function getAllMarketLocations(): string[] {
  return Object.keys(MARKET_CONFIGS)
}

export function findItemInMarkets(
  itemName: string
): Array<{ location: string; config: MarketItem }> {
  const results: Array<{ location: string; config: MarketItem }> = []

  for (const [location, items] of Object.entries(MARKET_CONFIGS)) {
    const item = items.find((item) => item.name === itemName)
    if (item) {
      results.push({ location, config: item })
    }
  }

  return results
}

export function getMarketStats() {
  const locations = Object.keys(MARKET_CONFIGS)
  const totalItems = Object.values(MARKET_CONFIGS).reduce(
    (sum, items) => sum + items.length,
    0
  )

  const allItems = Object.values(MARKET_CONFIGS).flat()
  const totalQuantity = allItems.reduce((sum, item) => sum + item.quantity, 0)
  const averagePrice = Math.round(
    allItems.reduce((sum, item) => sum + item.price, 0) / allItems.length
  )

  const priceRanges = {
    cheap: allItems.filter((item) => item.price < 20).length,
    moderate: allItems.filter((item) => item.price >= 20 && item.price < 100)
      .length,
    expensive: allItems.filter((item) => item.price >= 100 && item.price < 500)
      .length,
    luxury: allItems.filter((item) => item.price >= 500).length,
  }

  return {
    marketLocations: locations.length,
    totalListings: totalItems,
    totalQuantity,
    averagePrice,
    priceRanges,
    itemsByLocation: locations.reduce((acc, location) => {
      acc[location] = MARKET_CONFIGS[location].length
      return acc
    }, {} as Record<string, number>),
  }
}

export function validateMarketConfigs(availableItems: string[]): string[] {
  const issues: string[] = []

  for (const [location, items] of Object.entries(MARKET_CONFIGS)) {
    for (const item of items) {
      if (!availableItems.includes(item.name)) {
        issues.push(
          `${location}: Item "${item.name}" not found in available items`
        )
      }
      if (item.quantity <= 0) {
        issues.push(
          `${location}: Item "${item.name}" has invalid quantity: ${item.quantity}`
        )
      }
      if (item.price <= 0) {
        issues.push(
          `${location}: Item "${item.name}" has invalid price: ${item.price}`
        )
      }
    }
  }

  return issues
}
