// src/lib/convex-adapters.ts
// Maps Convex camelCase data to UI-compatible shapes that include snake_case aliases
import type { Character, Location, Item, InventoryItem, MarketItem, ChatMessage, Transaction, Player } from '@/types'

export function adaptItem(i: any): Item {
  if (!i) return i
  return {
    _id: i._id,
    id: i._id,
    name: i.name,
    description: i.description,
    category: i.category,
    rarity: i.rarity,
    layerFile: i.layerFile ?? null,
    layerType: i.layerType ?? null,
    layerGender: i.layerGender ?? null,
    layerOrder: i.layerOrder ?? null,
    baseLayerFile: i.baseLayerFile ?? null,
    imageUrl: i.imageUrl ?? null,
    isVisual: i.isVisual ?? null,
    hasGenderVariants: i.hasGenderVariants ?? null,
    healthEffect: i.healthEffect ?? null,
    energyEffect: i.energyEffect ?? null,
    durability: i.durability ?? null,
    compatibilityRules: i.compatibilityRules,
    // snake_case
    layer_file: i.layerFile ?? null,
    layer_type: i.layerType ?? null,
    layer_gender: i.layerGender ?? null,
    base_layer_file: i.baseLayerFile ?? null,
    image_url: i.imageUrl ?? null,
    is_visual: i.isVisual ?? null,
    has_gender_variants: i.hasGenderVariants ?? null,
    health_effect: i.healthEffect ?? null,
    energy_effect: i.energyEffect ?? null,
    created_at: i.createdAt ? new Date(i.createdAt).toISOString() : undefined,
    updated_at: i.updatedAt ? new Date(i.updatedAt).toISOString() : undefined,
  }
}

export function adaptLocation(l: any): Location {
  if (!l) return l
  return {
    _id: l._id,
    id: l._id,
    name: l.name,
    description: l.description,
    locationType: l.locationType ?? l.location_type ?? 'OUTPOST',
    chatScope: l.chatScope ?? 'LOCAL',
    difficulty: l.difficulty ?? 1,
    hasChat: l.hasChat ?? false,
    hasMarket: l.hasMarket ?? false,
    hasMining: l.hasMining ?? false,
    hasTravel: l.hasTravel ?? true,
    hasExchange: l.hasExchange ?? false,
    isPrivate: l.isPrivate ?? false,
    playerCount: l.playerCount ?? 0,
    svgPathId: l.svgPathId ?? null,
    biome: l.biome ?? null,
    minLevel: l.minLevel ?? null,
    mapX: l.mapX ?? null,
    mapY: l.mapY ?? null,
    parentLocationId: l.parentLocationId ?? null,
    // snake_case
    location_type: l.locationType ?? l.location_type ?? 'OUTPOST',
    chat_scope: l.chatScope ?? 'LOCAL',
    has_chat: l.hasChat ?? false,
    has_market: l.hasMarket ?? false,
    has_mining: l.hasMining ?? false,
    has_travel: l.hasTravel ?? true,
    has_exchange: l.hasExchange ?? false,
    is_private: l.isPrivate ?? false,
    player_count: l.playerCount ?? 0,
    svg_path_id: l.svgPathId ?? null,
    min_level: l.minLevel ?? null,
    map_x: l.mapX ?? null,
    map_y: l.mapY ?? null,
    welcome_message: l.welcomeMessage ?? null,
    status: l.status ?? null,
    created_at: l.createdAt ? new Date(l.createdAt).toISOString() : undefined,
    updated_at: l.updatedAt ? new Date(l.updatedAt).toISOString() : undefined,
  }
}

export function adaptInventoryItem(inv: any): InventoryItem {
  const item = inv.item ? adaptItem(inv.item) : null as any
  return {
    _id: inv._id,
    id: inv._id,
    characterId: inv.characterId,
    itemId: inv.itemId,
    quantity: inv.quantity,
    isEquipped: inv.isEquipped,
    equippedSlot: inv.equippedSlot ?? null,
    isPrimary: inv.isPrimary ?? false,
    slotIndex: inv.slotIndex ?? 1,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    // snake_case
    character_id: inv.characterId,
    item_id: inv.itemId,
    is_equipped: inv.isEquipped,
    equipped_slot: inv.equippedSlot ?? null,
    is_primary: inv.isPrimary ?? false,
    slot_index: inv.slotIndex ?? 1,
    created_at: inv.createdAt ? new Date(inv.createdAt).toISOString() : undefined,
    updated_at: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : undefined,
    item,
  }
}

export function adaptCharacter(c: any, location?: any, inventory?: any[], completedChapters?: string[]): Character {
  if (!c) return c
  return {
    _id: c._id,
    id: c._id,
    name: c.name,
    level: c.level,
    health: c.health,
    energy: c.energy,
    earth: c.earth,
    experience: c.experience ?? 0,
    gender: c.gender,
    status: c.status ?? 'ACTIVE',
    // camelCase
    walletAddress: c.walletAddress,
    characterType: c.characterType,
    currentLocationId: c.currentLocationId,
    currentImageUrl: c.currentImageUrl ?? null,
    birthImageUrl: c.birthImageUrl ?? null,
    nftAddress: c.nftAddress ?? null,
    tokenId: c.tokenId ?? null,
    currentVersion: c.currentVersion,
    baseLayerFile: c.baseLayerFile ?? null,
    baseGender: c.baseGender ?? null,
    paymentSignature: c.paymentSignature ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    // snake_case
    wallet_address: c.walletAddress,
    character_type: c.characterType,
    current_location_id: c.currentLocationId,
    current_image_url: c.currentImageUrl ?? null,
    nft_address: c.nftAddress ?? null,
    current_version: c.currentVersion,
    created_at: c.createdAt ? new Date(c.createdAt).toISOString() : undefined,
    updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : undefined,
    completed_chapters: completedChapters ?? [],
    story_flags: {},
    // Enriched
    currentLocation: location ? adaptLocation(location) : undefined,
    inventory: inventory ? inventory.map(adaptInventoryItem) : [],
  }
}

export function adaptMarketItem(listing: any): MarketItem {
  const item = listing.item ? adaptItem(listing.item) : null as any
  return {
    _id: listing._id,
    id: listing._id,
    locationId: listing.locationId,
    itemId: listing.itemId,
    price: listing.price,
    quantity: listing.quantity,
    isSystemItem: listing.isSystemItem ?? false,
    sellerId: listing.sellerId ?? null,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    location_id: listing.locationId,
    item_id: listing.itemId,
    is_system_item: listing.isSystemItem ?? false,
    seller_id: listing.sellerId ?? null,
    created_at: listing.createdAt ? new Date(listing.createdAt).toISOString() : undefined,
    updated_at: listing.updatedAt ? new Date(listing.updatedAt).toISOString() : undefined,
    item,
  }
}

export function adaptChatMessage(msg: any): ChatMessage {
  const now = Date.now()
  const ts = msg.createdAt ?? now
  return {
    _id: msg._id,
    id: msg._id,
    characterId: msg.characterId,
    locationId: msg.locationId,
    message: msg.message,
    messageType: msg.messageType ?? 'CHAT',
    isSystem: msg.isSystem ?? false,
    createdAt: ts,
    character_id: msg.characterId,
    location_id: msg.locationId,
    message_type: msg.messageType ?? 'CHAT',
    is_system: msg.isSystem ?? false,
    created_at: new Date(ts).toISOString(),
    timeAgo: getTimeAgo(new Date(ts)),
    character: msg.character
      ? {
          id: msg.character._id,
          name: msg.character.name,
          character_type: msg.character.characterType,
          image_url: msg.character.currentImageUrl ?? null,
          currentImageUrl: msg.character.currentImageUrl ?? null,
        }
      : undefined,
  }
}

export function adaptTransaction(txn: any): Transaction {
  return {
    _id: txn._id,
    id: txn._id,
    characterId: txn.characterId,
    type: txn.type,
    description: txn.description ?? null,
    itemId: txn.itemId ?? null,
    quantity: txn.quantity ?? null,
    earthTxn: txn.earthTxn ?? null,
    energyBurn: txn.energyBurn ?? null,
    createdAt: txn.createdAt,
    character_id: txn.characterId,
    item_id: txn.itemId ?? null,
    earth_txn: txn.earthTxn ?? null,
    energy_burn: txn.energyBurn ?? null,
    created_at: txn.createdAt ? new Date(txn.createdAt).toISOString() : undefined,
    character: txn.character
      ? {
          id: txn.character._id,
          name: txn.character.name,
          character_type: txn.character.characterType,
          current_image_url: txn.character.currentImageUrl ?? null,
          currentImageUrl: txn.character.currentImageUrl ?? null,
        }
      : undefined,
  }
}

export function adaptCharacterToPlayer(c: any): Player {
  return {
    id: c._id ?? c.id,
    name: c.name,
    gender: c.gender,
    character_type: c.characterType ?? c.character_type,
    level: c.level,
    energy: c.energy,
    health: c.health,
    status: c.status ?? null,
    current_image_url: c.currentImageUrl ?? c.current_image_url ?? null,
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}
