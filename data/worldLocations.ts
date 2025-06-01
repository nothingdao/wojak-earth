// data/worldLocations.ts - Fixed to match mapLocations names

export interface WorldLocation {
  name: string
  description: string
  biome: string
  difficulty: number
  hasMarket: boolean
  hasMining: boolean
  hasChat: boolean
  welcomeMessage: string
  lore?: string
  mapX?: number
  mapY?: number
  subLocations?: Omit<WorldLocation, 'subLocations'>[]
}

export const WORLD_LOCATIONS: WorldLocation[] = [
  // Original Regions
  {
    name: 'Mining Plains',
    description: 'Rich in basic materials and perfect for newcomers',
    biome: 'plains',
    difficulty: 1,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    welcomeMessage: 'The wind carries the sound of pickaxes striking stone.',
    lore: 'Once a vast battlefield, these plains now serve as the primary mining grounds for new arrivals.',
    mapX: 100,
    mapY: 200,
    subLocations: [
      {
        name: 'Rusty Pickaxe Inn',
        description: 'A cozy tavern where miners share stories and ale',
        biome: 'plains',
        difficulty: 1,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'The smell of ale and roasted meat fills the air.',
      },
      {
        name: 'Crystal Caves',
        description: 'Deep underground shafts where rare crystals grow',
        biome: 'underground',
        difficulty: 2,
        hasMarket: true,
        hasMining: true,
        hasChat: true,
        welcomeMessage: 'Crystalline formations sparkle in your torchlight.',
      },
    ],
  },

  {
    name: 'Underland',
    description:
      'Vast red-earth territories where ancient songlines whisper through weathered stone',
    biome: 'wilderness',
    difficulty: 3,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    welcomeMessage:
      'The red earth stretches endlessly under the scorching sun.',
    lore: 'These ancient lands hold secrets older than memory, where the very stones seem to hum with stories.',
    mapX: 200,
    mapY: 400,
  },

  {
    name: 'Retardia', // ← Fixed to match mapLocations.ts
    description: 'A dangerous mountain with lava flows and rare minerals',
    biome: 'volcanic',
    difficulty: 7,
    hasMarket: false,
    hasMining: true,
    hasChat: true,
    welcomeMessage: 'The heat is overwhelming, but the rewards are great.',
    lore: 'Ancient dwarves once mined here before the volcano awakened.',
    mapX: 500,
    mapY: 150,
  },

  {
    name: 'Frostpine Reaches',
    description: 'Snow-covered wilderness where old stories still echo',
    biome: 'alpine',
    difficulty: 3,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    welcomeMessage:
      'The silence here is broken only by wind through ancient pines.',
    lore: 'Local hunters speak in hushed tones of tracks too large for any known beast.',
    mapX: 150,
    mapY: 100,
    subLocations: [
      {
        name: 'Ironwood Trading Post',
        description:
          'Weathered lodge where trappers and traders gather by the hearth',
        biome: 'alpine',
        difficulty: 2,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Warmth radiates from the great stone fireplace.',
      },
      {
        name: 'Rimeglass Lake',
        description:
          'Partially frozen lake with waters impossibly deep and clear',
        biome: 'alpine',
        difficulty: 4,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: 'Something vast moves beneath the ice.',
      },
      {
        name: 'The Old Cairns',
        description: 'Stone markers left by peoples whose names are forgotten',
        biome: 'alpine',
        difficulty: 5,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: 'The stones seem to watch you with ancient patience.',
      },
    ],
  },

  {
    name: 'Desert Outpost',
    description: 'Harsh but rewarding terrain for experienced miners',
    biome: 'desert',
    difficulty: 3,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    welcomeMessage: 'The scorching sun beats down mercilessly.',
    lore: 'A remote trading post built around an ancient oasis.',
    mapX: 400,
    mapY: 100,
  },

  {
    name: 'Cyber City',
    description: 'The technological heart of wojak civilization',
    biome: 'urban',
    difficulty: 2,
    hasMarket: true,
    hasMining: false,
    hasChat: true,
    welcomeMessage: 'Neon lights flicker in the perpetual twilight.',
    lore: 'The beating heart of wojak civilization.',
    mapX: 300,
    mapY: 300,
    subLocations: [
      {
        name: 'Central Exchange',
        description: 'The main financial district and trading hub',
        biome: 'urban',
        difficulty: 2,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage:
          'Holographic displays show market prices from across the world.',
      },
      {
        name: 'The Glitch Club',
        description: 'Underground social hub for hackers and glass eaters',
        biome: 'urban',
        difficulty: 2,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Bass-heavy music thumps through the smoky atmosphere.',
      },
    ],
  },

  // Weird New Regions
  {
    name: 'The Glitch Wastes',
    description:
      'Digital desert where reality breaks down into pixelated fragments',
    biome: 'digital',
    difficulty: 4,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    welcomeMessage: 'ERROR_404: WELCOME_MESSAGE_NOT_FOUND',
    lore: 'Once a stable data center, this region was corrupted by a massive system failure.',
    mapX: 600,
    mapY: 150,
    subLocations: [
      {
        name: 'Error 404 Oasis',
        description: 'A rest stop that may or may not actually exist',
        biome: 'digital',
        difficulty: 4,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'null reference exception: comfort not found',
      },
      {
        name: 'Corrupted Data Mines',
        description: 'Extract valuable code fragments from broken databases',
        biome: 'digital',
        difficulty: 5,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: 'Warning: Memory corruption detected',
      },
    ],
  },

  {
    name: 'Fungi Networks',
    description: 'Underground mycelium city where everything is connected',
    biome: 'underground',
    difficulty: 3,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    welcomeMessage: 'The network acknowledges your presence.',
    lore: 'A vast underground organism that has achieved collective consciousness.',
    mapX: 200,
    mapY: 400,
    subLocations: [
      {
        name: 'Spore Exchange',
        description: 'Trading post where biological resources are shared',
        biome: 'underground',
        difficulty: 3,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Breathe deeply. The spores will show you the way.',
      },
      {
        name: 'The Great Mycelium',
        description: 'Central nervous system of the fungal network',
        biome: 'underground',
        difficulty: 4,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: 'You are now part of something greater.',
      },
    ],
  },

  {
    name: 'Temporal Rift Zone',
    description: 'Time moves strangely here, past and future bleeding together',
    biome: 'temporal',
    difficulty: 5,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    welcomeMessage: 'When are you?',
    lore: 'A scientific experiment gone wrong tore holes in spacetime.',
    mapX: 500,
    mapY: 350,
    subLocations: [
      {
        name: "Yesterday's Tomorrow",
        description:
          'A marketplace selling items from timelines that never were',
        biome: 'temporal',
        difficulty: 5,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'This conversation happened before you arrived.',
      },
      {
        name: 'Clock Tower Ruins',
        description:
          'Collapsed timekeeper where temporal fragments can be mined',
        biome: 'temporal',
        difficulty: 6,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: 'Time is broken here. Proceed with caution.',
      },
    ],
  },

  {
    name: 'The Bone Markets',
    description:
      'Skeletal merchants trade in organic technology and calcium currency',
    biome: 'ossuary',
    difficulty: 3,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    welcomeMessage: 'Welcome, flesh-bearer. What bones do you bring?',
    lore: 'An ancient cemetery evolved into a thriving market.',
    mapX: 150,
    mapY: 300,
    subLocations: [
      {
        name: 'Calcium Exchange',
        description: 'Primary trading floor for bone-based materials',
        biome: 'ossuary',
        difficulty: 3,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Rattle your coins, the dealers are listening.',
      },
      {
        name: 'Ossuary Club',
        description:
          'Social gathering place decorated with artistic bone arrangements',
        biome: 'ossuary',
        difficulty: 2,
        hasMarket: false,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Dance among the ancestors.',
      },
    ],
  },

  {
    name: 'Static Fields',
    description:
      'Everything covered in TV static, reality unclear and shifting',
    biome: 'electromagnetic',
    difficulty: 4,
    hasMarket: true,
    hasMining: true,
    hasChat: true,
    welcomeMessage: '████████ ██ ████ ███ ████',
    lore: 'A massive electromagnetic anomaly interferes with all signals.',
    mapX: 450,
    mapY: 250,
    subLocations: [
      {
        name: 'Channel 0',
        description:
          'Broadcasting station for frequencies that should not exist',
        biome: 'electromagnetic',
        difficulty: 4,
        hasMarket: false,
        hasMining: true,
        hasChat: true,
        welcomeMessage: '█ow ██ █ing?',
      },
      {
        name: 'Dead Air Tavern',
        description:
          'Social hub where the static is slightly less overwhelming',
        biome: 'electromagnetic',
        difficulty: 3,
        hasMarket: true,
        hasMining: false,
        hasChat: true,
        welcomeMessage: 'Can you hear me now? Good.',
      },
    ],
  },
]

// Helper to get all locations (including sub-locations) as flat array
export function getAllLocations(): WorldLocation[] {
  const allLocations: WorldLocation[] = []

  for (const location of WORLD_LOCATIONS) {
    allLocations.push(location)
    if (location.subLocations) {
      allLocations.push(...location.subLocations)
    }
  }

  return allLocations
}

// Helper to find location by name
export function findLocationByName(name: string): WorldLocation | undefined {
  return getAllLocations().find((loc) => loc.name === name)
}

// Helper to generate location key from name
export function locationNameToKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}
