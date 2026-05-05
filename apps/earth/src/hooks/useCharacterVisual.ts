// src/hooks/useCharacterVisual.ts
// Hook for fetching and managing character visual data

import { useState, useEffect, useCallback } from 'react'
import type { Character } from '@/types'
import { convexHttp } from '@/lib/convex-singleton'
import { api } from '@convex/_generated/api'

interface CharacterVisualData {
  character: {
    id: string
    name: string
    gender: string
    base_layer_file: string | null
    base_gender: string | null
    level: number
  }
  equipped_items: Array<{
    inventory_id: string
    equipped_slot: string
    slot_index: number
    is_primary: boolean
    item_name: string
    layer_type: string | null
    layer_file: string | null
    layer_gender: string | null
    layer_order: number
    category: string
    rarity: string
  }>
}

interface UseCharacterVisualReturn {
  visualData: CharacterVisualData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function getLayerOrder(layerType: string | null): number {
  const layerOrders: Record<string, number> = {
    CLOTHING: 4,
    OUTERWEAR: 5,
    FACE_ACCESSORY: 7,
    HAT: 8,
    ACCESSORY: 9,
  }
  return layerOrders[layerType || ''] || 0
}

export function useCharacterVisual(
  character: Character | null
): UseCharacterVisualReturn {
  const [visualData, setVisualData] = useState<CharacterVisualData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVisualData = useCallback(async () => {
    if (!character?.id) {
      setVisualData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await convexHttp.query(api.earth.characters.getVisualData, {
        characterId: character.id as any,
      })

      if (!result) throw new Error('Character not found')

      const adapted: CharacterVisualData = {
        character: {
          id: result.character._id.toString(),
          name: result.character.name,
          gender: result.character.gender,
          base_layer_file: result.character.baseLayerFile || (result.character.gender === 'FEMALE' ? 'female.png' : 'male.png'),
          base_gender: result.character.baseGender || result.character.gender,
          level: result.character.level,
        },
        equipped_items: result.equippedItems
          .filter((inv: any) => inv.item)
          .map((inv: any) => ({
            inventory_id: inv._id.toString(),
            equipped_slot: inv.equippedSlot || '',
            slot_index: 1,
            is_primary: false,
            item_name: inv.item.name,
            layer_type: inv.item.layerType ?? null,
            layer_file: inv.item.layerFile ?? null,
            layer_gender: inv.item.layerGender ?? null,
            layer_order: getLayerOrder(inv.item.layerType ?? null),
            category: inv.item.category,
            rarity: inv.item.rarity,
          }))
          .sort((a: any, b: any) => a.layer_order - b.layer_order),
      }

      setVisualData(adapted)
    } catch (err) {
      console.error('❌ Failed to fetch visual data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')

      // Fallback from character object
      if (character) {
        setVisualData(createFallbackVisualData(character))
      }
    } finally {
      setIsLoading(false)
    }
  }, [character?.id])

  const createFallbackVisualData = (char: Character): CharacterVisualData => {
    const equippedItems = (char.inventory || [])
      .filter((inv) => inv.is_equipped && inv.item.layer_file)
      .map((inv) => ({
        inventory_id: inv.id,
        equipped_slot: inv.equipped_slot || '',
        slot_index: inv.slot_index || 1,
        is_primary: inv.is_primary || false,
        item_name: inv.item.name,
        layer_type: inv.item.layer_type ?? null,
        layer_file: inv.item.layer_file ?? null,
        layer_gender: inv.item.layer_gender ?? null,
        layer_order: getLayerOrder(inv.item.layer_type ?? null),
        category: inv.item.category,
        rarity: inv.item.rarity,
      }))
      .sort((a, b) => a.layer_order - b.layer_order)

    return {
      character: {
        id: char.id,
        name: char.name,
        gender: char.gender,
        base_layer_file: char.gender === 'FEMALE' ? 'female.png' : 'male.png',
        base_gender: char.gender,
        level: char.level,
      },
      equipped_items: equippedItems,
    }
  }

  useEffect(() => {
    fetchVisualData()
  }, [fetchVisualData])

  useEffect(() => {
    if (character?.inventory) {
      const timer = setTimeout(fetchVisualData, 500)
      return () => clearTimeout(timer)
    }
  }, [character?.inventory, fetchVisualData])

  return {
    visualData,
    isLoading,
    error,
    refetch: fetchVisualData,
  }
}

// Alternative hook that works entirely client-side (fallback option)
export function useCharacterVisualLocal(character: Character | null) {
  const [visualData, setVisualData] = useState<CharacterVisualData | null>(null)

  useEffect(() => {
    if (!character) {
      setVisualData(null)
      return
    }

    const equippedItems = (character.inventory || [])
      .filter((inv) => inv.is_equipped && inv.item.layer_file)
      .map((inv) => ({
        inventory_id: inv.id,
        equipped_slot: inv.equipped_slot || '',
        slot_index: inv.slot_index || 1,
        is_primary: inv.is_primary || false,
        item_name: inv.item.name,
        layer_type: inv.item.layer_type ?? null,
        layer_file: inv.item.layer_file ?? null,
        layer_gender: inv.item.layer_gender ?? null,
        layer_order: getLayerOrder(inv.item.layer_type ?? null),
        category: inv.item.category,
        rarity: inv.item.rarity,
      }))

    setVisualData({
      character: {
        id: character.id,
        name: character.name,
        gender: character.gender,
        base_layer_file: character.gender === 'FEMALE' ? 'female.png' : 'male.png',
        base_gender: character.gender,
        level: character.level,
      },
      equipped_items: equippedItems,
    })
  }, [character])

  return {
    visualData,
    isLoading: false,
    error: null,
    refetch: async () => {},
  }
}
