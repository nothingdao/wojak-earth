// src/types/index.ts
export type GameView =
  | 'main'
  | 'map'
  | 'location'
  | 'mine'
  | 'market'
  | 'inventory'
  | 'chat'

export interface Character {
  id: string
  name: string
  gender: string
  energy: number
  health: number
  currentImageUrl: string
  currentLocation: {
    id: string
    name: string
    description: string
    locationType: string
    biome?: string
    welcomeMessage?: string
  }
  inventory: Array<{
    id: string
    quantity: number
    isEquipped: boolean
    item: {
      id: string
      name: string
      description: string
      category: string
      rarity: string
      imageUrl?: string
      energyEffect?: number
      healthEffect?: number
    }
  }>
  recentActivity: Array<{
    id: string
    type: string
    description: string
    item?: {
      name: string
      rarity: string
    }
  }>
}

export interface Location {
  id: string
  name: string
  description: string
  locationType: string
  biome?: string
  difficulty: number
  playerCount: number
  lastActive?: string
  hasMarket: boolean
  hasMining: boolean
  hasChat: boolean
  welcomeMessage?: string
  lore?: string
  subLocations?: Location[]
}

export interface MarketItem {
  id: string
  price: number
  quantity: number
  isSystemItem: boolean
  isLocalSpecialty?: boolean
  seller?: {
    id: string
    name: string
  }
  item: {
    id: string
    name: string
    description: string
    category: string
    rarity: string
    imageUrl?: string
  }
}

export interface ChatMessage {
  id: string
  message: string
  messageType: 'CHAT' | 'EMOTE' | 'SYSTEM'
  isSystem: boolean
  timeAgo: string
  createdAt: string
  character?: {
    id: string
    name: string
    characterType: string
    imageUrl?: string
  }
  location: {
    id: string
    name: string
    locationType: string
  }
}

export interface Player {
  id: string
  name: string
  gender: string
  characterType: string
  level: number
  energy: number
  health: number
  status: string
  currentImageUrl?: string
  equippedItems: Array<{
    name: string
    category: string
    rarity: string
  }>
}
