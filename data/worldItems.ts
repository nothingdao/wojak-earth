// data/worldItems.ts - Pure data, no dependencies, safe for browser

export interface WorldItem {
  name: string
  description: string
  category: string // Will be cast to Prisma enum in setup
  layerType?: string // Will be cast to Prisma enum in setup
  rarity: string // Will be cast to Prisma enum in setup
  durability?: number
  energyEffect?: number
  healthEffect?: number
}

export const WORLD_ITEMS: WorldItem[] = [
  // Basic Materials
  {
    name: 'Dirty Coal',
    description: 'Basic fuel found in shallow mines',
    category: 'MATERIAL',
    rarity: 'COMMON',
  },
  {
    name: 'Iron Scraps',
    description: 'Rusty metal pieces, still useful',
    category: 'MATERIAL',
    rarity: 'COMMON',
  },
  {
    name: 'Ancient Coin',
    description: 'Currency from a forgotten civilization',
    category: 'MATERIAL',
    rarity: 'RARE',
  },
  {
    name: 'Crystal Shard',
    description: 'Glowing fragment with mysterious properties',
    category: 'MATERIAL',
    rarity: 'EPIC',
  },

  // Basic Equipment
  {
    name: 'Miners Hat',
    description: 'Worn leather hat with a dim headlamp',
    category: 'HAT',
    layerType: 'HAT',
    rarity: 'COMMON',
    durability: 100,
    energyEffect: 5,
  },
  {
    name: 'Work Gloves',
    description: 'Tough gloves for manual labor',
    category: 'CLOTHING',
    layerType: 'ACCESSORY',
    rarity: 'COMMON',
    durability: 80,
  },
  {
    name: 'Lucky Charm',
    description: "A rabbit's foot that might bring fortune",
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'UNCOMMON',
  },
  {
    name: 'Cyber Jacket',
    description: 'High-tech jacket with built-in displays',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'RARE',
    energyEffect: 15,
  },
  {
    name: 'Sandstorm Goggles',
    description: 'Reinforced eyewear that filters out dust and glare',
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'UNCOMMON',
    durability: 60,
    energyEffect: 5,
  },
  {
    name: 'Heat Dispersal Vest',
    description: 'Reflective vest with cooling gel chambers',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'RARE',
    durability: 100,
    healthEffect: 12,
    energyEffect: 15, // Keeps you cool and energized
  },
  // Basic Consumables
  {
    name: 'Energy Drink',
    description: 'Restores energy and keeps you alert',
    category: 'CONSUMABLE',
    rarity: 'COMMON',
    energyEffect: 25,
  },
  {
    name: 'Health Potion',
    description: 'Mysterious red liquid that heals wounds',
    category: 'CONSUMABLE',
    rarity: 'UNCOMMON',
    healthEffect: 30,
  },

  // Tools
  {
    name: 'Basic Pickaxe',
    description: 'Standard mining tool for beginners',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'COMMON',
    durability: 50,
  },
  {
    name: 'Multi-Tool',
    description: 'Swiss army knife of the digital age',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'COMMON',
    durability: 100,
  },
  {
    name: 'Hacking Toolkit',
    description: 'Portable device for digital infiltration',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'RARE',
    durability: 150,
  },
  {
    name: 'Omni-Tool',
    description: 'Legendary device that adapts to any situation',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'LEGENDARY',
    durability: 1000,
    energyEffect: 20,
    healthEffect: 10,
  },

  // Themed Items - Cyber
  {
    name: 'Rare Floppy Disk',
    description: 'Contains legendary source code from the early net',
    category: 'MATERIAL',
    rarity: 'LEGENDARY',
  },
  {
    name: 'Cyberpunk Shades',
    description: 'AR-enhanced sunglasses with data overlay',
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'RARE',
    energyEffect: 10,
  },
  {
    name: 'Neon Visor',
    description: 'Glowing headgear that screams "I hack the planet"',
    category: 'HAT',
    layerType: 'HAT',
    rarity: 'EPIC',
    energyEffect: 15,
  },

  {
    name: 'Neural Interface Crown',
    description: 'Circlet of circuits that enhances digital perception',
    category: 'HAT',
    layerType: 'HAT',
    rarity: 'LEGENDARY',
    durability: 200,
    energyEffect: 25,
  },

  {
    name: 'Data Armor Plating',
    description: 'Modular armor that adapts to digital threats',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'EPIC',
    durability: 180,
    healthEffect: 25,
    energyEffect: 5,
  },

  {
    name: 'Adaptive Respirator',
    description: 'Smart mask that filters any atmospheric condition',
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'RARE',
    durability: 90,
    healthEffect: 18,
  },

  {
    name: 'Climate Sensor Bracelet',
    description: 'Warns of environmental dangers and optimizes gear',
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'UNCOMMON',
    durability: 70,
    energyEffect: 12,
  },

  {
    name: 'Survival Pack Harness',
    description: 'Ergonomic gear system that distributes weight perfectly',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'COMMON',
    durability: 50,
    energyEffect: 8,
    healthEffect: 5,
  },

  // Themed Items - Desert
  {
    name: 'Desert Wrap',
    description: 'Traditional headwrap that protects from sandstorms',
    category: 'HAT',
    layerType: 'HAT',
    rarity: 'UNCOMMON',
    healthEffect: 8,
  },
  {
    name: 'Ancient Artifact',
    description: 'Mysterious relic from a lost desert civilization',
    category: 'MATERIAL',
    rarity: 'LEGENDARY',
  },

  // Weird Items - Glitch
  {
    name: 'Fragmented Code',
    description: 'Broken data fragments that shimmer with digital energy',
    category: 'MATERIAL',
    rarity: 'RARE',
  },
  {
    name: 'Pixel Dust',
    description: 'Granular reality particles from corrupted textures',
    category: 'MATERIAL',
    rarity: 'COMMON',
  },
  {
    name: 'Buffer Overflow Potion',
    description:
      'Dangerous digital brew that crashes your system... in a good way',
    category: 'CONSUMABLE',
    rarity: 'EPIC',
    energyEffect: 150,
  },
  {
    name: 'Glitch Goggles',
    description: 'See through the matrix with corrupted vision',
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'RARE',
    energyEffect: 10,
  },

  // Weird Items - Fungi
  {
    name: 'Neural Spores',
    description: 'Microscopic fungal networks that enhance thought',
    category: 'MATERIAL',
    rarity: 'UNCOMMON',
  },
  {
    name: 'Symbiotic Armor',
    description: 'Living fungal protection that grows with you',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'EPIC',
    healthEffect: 25,
  },
  {
    name: 'Mycelium Thread',
    description: 'Natural fiber that connects all living things',
    category: 'MATERIAL',
    rarity: 'COMMON',
  },

  // Weird Items - Temporal
  {
    name: 'Temporal Flux',
    description: 'Crystallized time that bends around your fingers',
    category: 'MATERIAL',
    rarity: 'LEGENDARY',
  },
  {
    name: 'Paradox Engine',
    description: 'Mechanical device that exists in multiple timelines',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'LEGENDARY',
    durability: 999,
    energyEffect: 50,
  },
  {
    name: 'Causality Loop',
    description: 'Effect becomes cause becomes effect becomes...',
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'EPIC',
  },

  // Weird Items - Bone
  {
    name: 'Living Bone Tools',
    description: 'Ossified implements that grow sharper with use',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'RARE',
    durability: 200,
  },
  {
    name: 'Calcium Crystals',
    description: 'Mineralized bone structure with geometric perfection',
    category: 'MATERIAL',
    rarity: 'UNCOMMON',
  },
  {
    name: 'Skeletal Framework',
    description: 'Wearable bone structure that supports heavy lifting',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'RARE',
    healthEffect: 20,
  },

  // Weird Items - Static
  {
    name: 'White Noise Generator',
    description: 'Creates interference that masks your presence',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'RARE',
    durability: 100,
  },
  {
    name: 'Static Cling',
    description: 'Electromagnetic adhesive that sticks to anything',
    category: 'MATERIAL',
    rarity: 'COMMON',
  },
  {
    name: 'Frequency Modulator',
    description: 'Tunes reality to different channels',
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'EPIC',
    energyEffect: 15,
  },
  {
    name: 'Signal Booster Helmet',
    description: 'Amplifies brainwaves through electromagnetic fields',
    category: 'HAT',
    layerType: 'HAT',
    rarity: 'RARE',
    energyEffect: 20,
  },

  // Themed Items - Frostpine
  {
    name: 'Frostbite Cloak',
    description: 'Thick fur-lined cloak that shimmers with ice crystals',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'RARE',
    durability: 120,
    healthEffect: 15,
    energyEffect: -5, // Heavy but protective
  },

  {
    name: 'Ice Walker Boots',
    description: 'Spiked boots that grip frozen surfaces perfectly',
    category: 'CLOTHING',
    layerType: 'ACCESSORY',
    rarity: 'UNCOMMON',
    durability: 80,
    energyEffect: 8, // Better movement on ice
  },

  {
    name: 'Thermal Undersuit',
    description: 'Advanced base layer that regulates body temperature',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'EPIC',
    durability: 150,
    healthEffect: 20,
    energyEffect: 10,
  },
]

// Helper functions
export function getAllItems(): WorldItem[] {
  return [...WORLD_ITEMS]
}

export function findItemByName(name: string): WorldItem | undefined {
  return WORLD_ITEMS.find((item) => item.name === name)
}

export function getItemsByCategory(category: string): WorldItem[] {
  return WORLD_ITEMS.filter((item) => item.category === category)
}

export function getItemsByRarity(rarity: string): WorldItem[] {
  return WORLD_ITEMS.filter((item) => item.rarity === rarity)
}

export function getItemsByLayerType(layerType: string): WorldItem[] {
  return WORLD_ITEMS.filter((item) => item.layerType === layerType)
}

export function generateItemImageUrl(itemName: string): string {
  return `/items/${itemName.toLowerCase().replace(/\s+/g, '-')}.png`
}

export function getItemStats() {
  const categories = [
    'MATERIAL',
    'HAT',
    'CLOTHING',
    'ACCESSORY',
    'CONSUMABLE',
    'TOOL',
  ]
  const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']

  return {
    total: WORLD_ITEMS.length,
    byCategory: categories.reduce((acc, category) => {
      acc[category] = getItemsByCategory(category).length
      return acc
    }, {} as Record<string, number>),
    byRarity: rarities.reduce((acc, rarity) => {
      acc[rarity] = getItemsByRarity(rarity).length
      return acc
    }, {} as Record<string, number>),
  }
}
