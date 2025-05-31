// data/characterTemplates.ts - Pure data, no dependencies, safe for browser

export interface CharacterTemplate {
  name: string
  gender: string // Will be cast to Prisma Gender enum in setup
  location: string
  energy: number
  health: number
}

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    name: 'Wojak #1337',
    gender: 'MALE',
    location: 'Mining Plains',
    energy: 85,
    health: 100,
  },
  {
    name: 'Wojak #420',
    gender: 'MALE',
    location: 'Mining Plains',
    energy: 95,
    health: 100,
  },
  {
    name: 'Wojak #69',
    gender: 'FEMALE',
    location: 'Rusty Pickaxe Inn',
    energy: 70,
    health: 100,
  },
  {
    name: 'Wojak #888',
    gender: 'MALE',
    location: 'Crystal Caves',
    energy: 45,
    health: 90,
  },
  {
    name: 'Wojak #2077',
    gender: 'FEMALE',
    location: 'Crystal Caves',
    energy: 60,
    health: 85,
  },
  {
    name: 'Wojak #100',
    gender: 'MALE',
    location: 'Central Exchange',
    energy: 80,
    health: 100,
  },
  {
    name: 'Wojak #777',
    gender: 'FEMALE',
    location: 'Central Exchange',
    energy: 90,
    health: 95,
  },
  {
    name: 'Wojak #333',
    gender: 'MALE',
    location: 'The Glitch Club',
    energy: 55,
    health: 80,
  },
  {
    name: 'Wojak #555',
    gender: 'FEMALE',
    location: 'Desert Outpost',
    energy: 40,
    health: 75,
  },
  {
    name: 'Wojak #999',
    gender: 'MALE',
    location: 'Desert Outpost',
    energy: 85,
    health: 100,
  },

  // New characters for weird regions
  {
    name: 'Wojak #404',
    gender: 'MALE',
    location: 'The Glitch Wastes',
    energy: 50,
    health: 95,
  },
  {
    name: 'Wojak #101',
    gender: 'FEMALE',
    location: 'Fungi Networks',
    energy: 75,
    health: 85,
  },
  {
    name: 'Wojak #2025',
    gender: 'MALE',
    location: 'Temporal Rift Zone',
    energy: 90,
    health: 80,
  },
  {
    name: 'Wojak #666',
    gender: 'FEMALE',
    location: 'The Bone Markets',
    energy: 65,
    health: 90,
  },
  {
    name: 'Wojak #000',
    gender: 'MALE',
    location: 'Static Fields',
    energy: 30,
    health: 100,
  },
]

// Helper functions
export function getAllCharacterTemplates(): CharacterTemplate[] {
  return [...CHARACTER_TEMPLATES]
}

export function findCharacterByName(
  name: string
): CharacterTemplate | undefined {
  return CHARACTER_TEMPLATES.find((char) => char.name === name)
}

export function getCharactersByLocation(location: string): CharacterTemplate[] {
  return CHARACTER_TEMPLATES.filter((char) => char.location === location)
}

export function getCharactersByGender(gender: string): CharacterTemplate[] {
  return CHARACTER_TEMPLATES.filter((char) => char.gender === gender)
}

export function generateCharacterId(name: string): string {
  return `char_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
}

export function extractTokenId(name: string): string {
  const match = name.match(/#(\d+)/)
  return match ? match[1] : Math.floor(Math.random() * 999999).toString()
}

export function generateCharacterImageUrl(name: string): string {
  const tokenId = extractTokenId(name)
  return `/wojak-${tokenId}.png`
}

export function generateUniqueNumber(): number {
  return Math.floor(Math.random() * 999999) + 1
}

export function generateWalletAddress(): string {
  return `WALLET_${generateUniqueNumber()}`
}

export function generateNftAddress(): string {
  return `NFT_${generateUniqueNumber()}`
}

export function getCharacterStats() {
  const locations = [
    ...new Set(CHARACTER_TEMPLATES.map((char) => char.location)),
  ]
  const genders = ['MALE', 'FEMALE', 'NON_BINARY']

  return {
    total: CHARACTER_TEMPLATES.length,
    byLocation: locations.reduce((acc, location) => {
      acc[location] = getCharactersByLocation(location).length
      return acc
    }, {} as Record<string, number>),
    byGender: genders.reduce((acc, gender) => {
      acc[gender] = getCharactersByGender(gender).length
      return acc
    }, {} as Record<string, number>),
    averageEnergy: Math.round(
      CHARACTER_TEMPLATES.reduce((sum, char) => sum + char.energy, 0) /
        CHARACTER_TEMPLATES.length
    ),
    averageHealth: Math.round(
      CHARACTER_TEMPLATES.reduce((sum, char) => sum + char.health, 0) /
        CHARACTER_TEMPLATES.length
    ),
  }
}
