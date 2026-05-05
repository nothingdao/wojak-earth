// src/components/admin/types.ts - Admin UI types
import type { Character, Location, Item, MarketListing, ChatMessage, Transaction } from '@/types'

export type { Character, Location, Item, MarketListing, ChatMessage, Transaction }

export interface AdminStats {
  totalCharacters: number
  totalLocations: number
  totalItems: number
  totalResources: number
  activeCharacters: number
  onlineNow: number
  avgPlayerLevel: number
}

export interface AdminCharacter extends Character {
  locationName: string
}

export interface AdminLocation extends Location {
  player_count: number
}

export interface AdminMarketListing extends MarketListing {
  locationName: string
  itemName: string
  sellerName?: string
}

export interface AdminActivity {
  id: string
  type: 'character' | 'mining' | 'travel' | 'market'
  action: string
  target: string
  timestamp: string
  characterName?: string
  locationName?: string
}
