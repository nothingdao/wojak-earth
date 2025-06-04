// data/worldItems.ts - Pure data, no dependencies, safe for browser

export interface WorldItem {
  name: string
  description: string
  category: string
  layerType?: string
  rarity: string
  durability?: number
  energyEffect?: number
  healthEffect?: number
}

export const WORLD_ITEMS: WorldItem[] = [
  // ===== BASIC MATERIALS =====
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

  // ===== BASIC EQUIPMENT =====
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

  // ===== BASIC CONSUMABLES =====
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
  {
    name: 'Ration Pack',
    description: 'Preserved food that sustains you for hours',
    category: 'CONSUMABLE',
    rarity: 'COMMON',
    energyEffect: 15,
    healthEffect: 10,
  },

  // ===== BASIC TOOLS =====
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

  // ===== URBAN/CYBER BIOME ITEMS =====
  {
    name: 'Cyber Jacket',
    description: 'High-tech jacket with built-in displays',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'RARE',
    durability: 120,
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
    name: 'Hacking Toolkit',
    description: 'Portable device for digital infiltration',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'RARE',
    durability: 150,
  },
  {
    name: 'Data Chip',
    description: 'Encrypted storage containing valuable information',
    category: 'MATERIAL',
    rarity: 'UNCOMMON',
  },
  {
    name: 'Bandwidth Booster',
    description: 'Enhances connection speed and data flow',
    category: 'CONSUMABLE',
    rarity: 'RARE',
    energyEffect: 35,
  },

  // ===== DIGITAL BIOME ITEMS =====
  {
    name: 'Rare Floppy Disk',
    description: 'Contains legendary source code from the early net',
    category: 'MATERIAL',
    rarity: 'LEGENDARY',
  },
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
  {
    name: 'Error Handler',
    description: 'Debug tool that fixes reality glitches',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'EPIC',
    durability: 75,
  },

  // ===== DESERT BIOME ITEMS =====
  {
    name: 'Desert Wrap',
    description: 'Traditional headwrap that protects from sandstorms',
    category: 'HAT',
    layerType: 'HAT',
    rarity: 'UNCOMMON',
    healthEffect: 8,
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
    energyEffect: 15,
  },
  {
    name: 'Ancient Artifact',
    description: 'Mysterious relic from a lost desert civilization',
    category: 'MATERIAL',
    rarity: 'LEGENDARY',
  },
  {
    name: 'Water Purification Tablet',
    description: 'Makes any water source safe to drink',
    category: 'CONSUMABLE',
    rarity: 'UNCOMMON',
    healthEffect: 20,
  },
  {
    name: 'Dune Boots',
    description: 'Specialized footwear for walking on sand',
    category: 'CLOTHING',
    layerType: 'ACCESSORY',
    rarity: 'COMMON',
    energyEffect: 8,
  },

  // ===== ALPINE/FROSTPINE BIOME ITEMS =====
  {
    name: 'Frostbite Cloak',
    description: 'Thick fur-lined cloak that shimmers with ice crystals',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'RARE',
    durability: 120,
    healthEffect: 15,
    energyEffect: -5,
  },
  {
    name: 'Ice Walker Boots',
    description: 'Spiked boots that grip frozen surfaces perfectly',
    category: 'CLOTHING',
    layerType: 'ACCESSORY',
    rarity: 'UNCOMMON',
    durability: 80,
    energyEffect: 8,
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
  {
    name: 'Hot Cocoa',
    description: 'Steaming beverage that warms you from the inside',
    category: 'CONSUMABLE',
    rarity: 'COMMON',
    healthEffect: 15,
    energyEffect: 10,
  },
  {
    name: 'Ironwood Planks',
    description: 'Durable wood from the legendary ironwood trees',
    category: 'MATERIAL',
    rarity: 'RARE',
  },
  {
    name: 'Frost Crystal',
    description: 'Perfectly formed ice that never melts',
    category: 'MATERIAL',
    rarity: 'EPIC',
  },

  // ===== UNDERGROUND/FUNGI BIOME ITEMS =====
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
    durability: 160,
    healthEffect: 25,
  },
  {
    name: 'Mycelium Thread',
    description: 'Natural fiber that connects all living things',
    category: 'MATERIAL',
    rarity: 'COMMON',
  },
  {
    name: 'Spore Mask',
    description: 'Filters air while allowing beneficial spores through',
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'UNCOMMON',
    healthEffect: 12,
  },
  {
    name: 'Network Interface',
    description: 'Biological device that connects to the mycelium web',
    category: 'TOOL',
    layerType: 'ACCESSORY',
    rarity: 'RARE',
    energyEffect: 20,
  },
  {
    name: 'Mushroom Stew',
    description: 'Hearty meal that connects you to the network',
    category: 'CONSUMABLE',
    rarity: 'COMMON',
    healthEffect: 25,
    energyEffect: 15,
  },

  // ===== TEMPORAL BIOME ITEMS =====
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
  {
    name: 'Chronometer Watch',
    description: 'Keeps perfect time across all timelines',
    category: 'ACCESSORY',
    layerType: 'ACCESSORY',
    rarity: 'RARE',
    energyEffect: 15,
  },
  {
    name: 'Time Shard',
    description: 'Fragment of a broken timeline',
    category: 'MATERIAL',
    rarity: 'RARE',
  },
  {
    name: 'Temporal Stabilizer',
    description: 'Prevents time-sickness and paradox headaches',
    category: 'CONSUMABLE',
    rarity: 'UNCOMMON',
    healthEffect: 20,
  },

  // ===== OSSUARY BIOME ITEMS =====
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
    durability: 140,
    healthEffect: 20,
  },
  {
    name: 'Bone Meal',
    description: 'Powdered calcium supplement for stronger bones',
    category: 'CONSUMABLE',
    rarity: 'COMMON',
    healthEffect: 18,
  },
  {
    name: 'Marrow Extract',
    description: 'Life essence extracted from ancient bones',
    category: 'CONSUMABLE',
    rarity: 'RARE',
    healthEffect: 40,
    energyEffect: 20,
  },
  {
    name: 'Fossil Fragment',
    description: 'Petrified remains from a prehistoric creature',
    category: 'MATERIAL',
    rarity: 'EPIC',
  },

  // ===== ELECTROMAGNETIC BIOME ITEMS =====
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
  {
    name: 'Radio Wave',
    description: 'Captured electromagnetic signal in crystalline form',
    category: 'MATERIAL',
    rarity: 'UNCOMMON',
  },
  {
    name: 'Static Shock Drink',
    description: 'Electrolyte beverage that tingles with energy',
    category: 'CONSUMABLE',
    rarity: 'COMMON',
    energyEffect: 30,
  },

  // ===== VOLCANIC ITEMS (RETARDIA) =====
  {
    name: 'Magma Shard',
    description: 'Molten rock that retains its heat',
    category: 'MATERIAL',
    rarity: 'EPIC',
  },
  {
    name: 'Heat Shield',
    description: 'Protective barrier against extreme temperatures',
    category: 'CLOTHING',
    layerType: 'CLOTHING',
    rarity: 'LEGENDARY',
    durability: 200,
    healthEffect: 30,
  },
  {
    name: 'Lava Tube Map',
    description: 'Guide to safe passages through volcanic terrain',
    category: 'MATERIAL',
    rarity: 'RARE',
  },

  // ===== UNIVERSAL ADVANCED ITEMS =====
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
