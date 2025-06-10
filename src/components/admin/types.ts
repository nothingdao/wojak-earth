// src/components/admin/types.ts
import type { Tables } from '@/types/supabase'

// Use Supabase types as source of truth
export type Character = Tables<'characters'>
export type Location = Tables<'locations'>
export type Item = Tables<'items'>
export type MarketListing = Tables<'market_listings'>
export type ChatMessage = Tables<'chat_messages'>
export type Transaction = Tables<'transactions'>

// Admin-specific enhanced types
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
