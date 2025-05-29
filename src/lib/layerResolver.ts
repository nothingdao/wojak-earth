// src/utils/layerResolver.ts
export interface LayerConfig {
  type: 'background' | 'base' | 'clothing' | 'accessory' | 'overlay'
  name: string
  zIndex: number
  visible: boolean
}

export interface VisibilityRules {
  [key: string]: {
    blocks?: string[] // What this layer blocks
    blockedBy?: string[] // What blocks this layer
    requires?: string[] // What this layer requires to be visible
  }
}

// Asset URL resolver
export function getAssetUrl(type: string, name: string): string {
  return `https://earth.ndao.computer/layers/${type}s/${name}.png`
}

// Layer visibility rules - customize based on your game logic
export const LAYER_VISIBILITY_RULES: VisibilityRules = {
  // Clothing rules
  'cyber-jacket': {
    blocks: ['parka-yellow', 'miners-jacket'], // Can't wear multiple jackets
    blockedBy: [],
  },
  'parka-yellow': {
    blocks: ['cyber-jacket', 'miners-jacket'],
    blockedBy: [],
  },
  'miners-jacket': {
    blocks: ['cyber-jacket', 'parka-yellow'],
    blockedBy: [],
  },

  // Accessory rules
  sunglasses: {
    blocks: [], // Sunglasses don't block other accessories
    blockedBy: [],
  },
  'gold-chain': {
    blocks: [],
    blockedBy: [],
  },
  'lucky-charm': {
    blocks: [],
    blockedBy: [],
  },

  // Overlay rules
  'glow-red': {
    blocks: ['rain-fog'], // Glow effects might override weather
    blockedBy: [],
  },
  'rain-fog': {
    blocks: [],
    blockedBy: ['glow-red'],
  },
  'glitch-vibe': {
    blocks: [],
    blockedBy: [],
  },
}

// Resolve which layers should be visible based on equipped items and rules
export function resolveVisibleLayers(character: {
  gender: string
  characterType: string
  currentLocation: { biome?: string; name: string }
  inventory: Array<{
    item: {
      name: string
      category: string
      layerType?: string
    }
    isEquipped: boolean
  }>
}): LayerConfig[] {
  const layers: LayerConfig[] = []

  // 1. Add background based on location
  const backgroundName = getBackgroundForLocation(character.currentLocation)
  if (backgroundName) {
    layers.push({
      type: 'background',
      name: backgroundName,
      zIndex: 0,
      visible: true,
    })
  }

  // 2. Add base layer based on character type and gender
  const baseName = getBaseForCharacter(character)
  layers.push({
    type: 'base',
    name: baseName,
    zIndex: 1,
    visible: true,
  })

  // 3. Add equipped items as layers
  const equippedItems = character.inventory.filter((inv) => inv.isEquipped)

  equippedItems.forEach((inv) => {
    const layerType = mapCategoryToLayerType(inv.item.category)
    const layerName = kebabCase(inv.item.name)

    if (layerType) {
      layers.push({
        type: layerType,
        name: layerName,
        zIndex: getZIndexForLayerType(layerType),
        visible: true, // Will be resolved in visibility step
      })
    }
  })

  // 4. Add contextual overlays (weather, effects, etc.)
  const overlays = getContextualOverlays(character)
  overlays.forEach((overlay) => {
    layers.push({
      type: 'overlay',
      name: overlay,
      zIndex: 10,
      visible: true,
    })
  })

  // 5. Apply visibility rules
  return applyVisibilityRules(layers)
}

// Helper functions
function getBackgroundForLocation(location: {
  biome?: string
  name: string
}): string | null {
  // Map location biomes to background images
  const biomeMap: { [key: string]: string } = {
    plains: 'mining-plains',
    desert: 'desert-outpost',
    urban: 'cyber-city',
  }

  return location.biome ? biomeMap[location.biome] || null : null
}

function getBaseForCharacter(character: {
  gender: string
  characterType: string
}): string {
  if (character.characterType === 'CREATURE') {
    return 'creature'
  }
  return character.gender.toLowerCase() // 'male' or 'female'
}

function mapCategoryToLayerType(category: string): LayerConfig['type'] | null {
  const categoryMap: { [key: string]: LayerConfig['type'] } = {
    CLOTHING: 'clothing',
    HAT: 'clothing', // Hats go in clothing layer
    ACCESSORY: 'accessory',
    TOOL: 'accessory', // Tools as accessories for now
  }

  return categoryMap[category] || null
}

function getZIndexForLayerType(type: LayerConfig['type']): number {
  const zIndexMap = {
    background: 0,
    base: 1,
    clothing: 2,
    accessory: 3,
    overlay: 10,
  }
  return zIndexMap[type]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getContextualOverlays(character: any): string[] {
  const overlays: string[] = []

  // Add overlays based on game state, time, events, etc.
  // Example: if character has low health, add a red glow
  if (character.health && character.health < 30) {
    overlays.push('glow-red')
  }

  // Add weather effects based on location
  if (character.currentLocation?.biome === 'desert' && Math.random() > 0.7) {
    // Sometimes add heat shimmer effect in desert
    // overlays.push('heat-shimmer')
  }

  return overlays
}

function applyVisibilityRules(layers: LayerConfig[]): LayerConfig[] {
  const visibleLayers = [...layers]

  // Apply blocking rules
  layers.forEach((layer) => {
    const rules = LAYER_VISIBILITY_RULES[layer.name]
    if (rules?.blocks) {
      rules.blocks.forEach((blockedName) => {
        const blockedLayer = visibleLayers.find((l) => l.name === blockedName)
        if (blockedLayer) {
          blockedLayer.visible = false
        }
      })
    }
  })

  // Sort by z-index and filter visible layers
  return visibleLayers
    .filter((layer) => layer.visible)
    .sort((a, b) => a.zIndex - b.zIndex)
}

// Utility function to convert item names to kebab-case for file names
function kebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Generate metadata for NFT
export interface NFTMetadata {
  name: string
  description: string
  image: string
  attributes: Array<{
    trait_type: string
    value: string
  }>
  assets: {
    layers: string[]
  }
}

export function generateNFTMetadata(character: {
  id: string
  name: string
  gender: string
  characterType: string
  currentLocation: { name: string; biome?: string }
  inventory: Array<{
    item: {
      name: string
      category: string
      rarity: string
      layerType?: string
    }
    isEquipped: boolean
  }>
  energy: number
  health: number
}): NFTMetadata {
  const visibleLayers = resolveVisibleLayers(character)

  // Generate attributes from visible layers and character stats
  const attributes = [
    { trait_type: 'Gender', value: character.gender },
    { trait_type: 'Type', value: character.characterType },
    { trait_type: 'Location', value: character.currentLocation.name },
  ]

  // Add background attribute
  const background = visibleLayers.find((l) => l.type === 'background')
  if (background) {
    attributes.push({
      trait_type: 'Background',
      value: background.name
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
    })
  }

  // Add equipped item attributes
  const equippedItems = character.inventory.filter((inv) => inv.isEquipped)
  equippedItems.forEach((inv) => {
    attributes.push({
      trait_type:
        inv.item.category.charAt(0) + inv.item.category.slice(1).toLowerCase(),
      value: inv.item.name,
    })
  })

  // Add status attributes
  if (character.energy < 30) {
    attributes.push({ trait_type: 'Status', value: 'Exhausted' })
  } else if (character.energy > 90) {
    attributes.push({ trait_type: 'Status', value: 'Energetic' })
  }

  // Generate description
  const description = generateDescription(character, equippedItems)

  return {
    name: character.name,
    description,
    image: `https://earth.ndao.computer/api/render/${character.id}.png`,
    attributes,
    assets: {
      layers: visibleLayers.map((layer) => getAssetUrl(layer.type, layer.name)),
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateDescription(character: any, equippedItems: any[]): string {
  const locationDesc = `wandering ${character.currentLocation.name}`
  const itemDesc =
    equippedItems.length > 0
      ? `equipped with ${equippedItems.map((i) => i.item.name).join(', ')}`
      : 'traveling light'

  const statusDesc =
    character.energy < 30
      ? 'looking weary from their adventures'
      : character.energy > 90
      ? 'full of energy and ready for action'
      : 'continuing their journey'

  return `A ${character.characterType.toLowerCase()} ${locationDesc}, ${itemDesc}, ${statusDesc}.`
}

// Export layer resolution for use in image rendering
export { resolveVisibleLayers as default }
