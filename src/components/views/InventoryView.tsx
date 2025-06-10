import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Zap, Heart, AlertTriangle, Star, Lock, Crown, Database, Activity, Package } from 'lucide-react'
import {
  GiBackpack,
  GiCrown,
  GiGemNecklace,
  GiSpade,
  GiHealthPotion,
  GiCube,
  GiTopHat,
  GiShirt,
  GiNecklace,
  GiMining,
  GiRock,
  GiWaterBottle,
  GiSunglasses,
  GiCloak
} from 'react-icons/gi'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Character } from '@/types'

interface InventoryViewProps {
  character: Character
  loadingItems: Set<string>
  onUseItem: (inventoryId: string, itemName: string, energy_effect?: number, health_effect?: number, event?: React.MouseEvent) => void
  onEquipItem: (inventoryId: string, is_equipped: boolean, targetSlot?: string, event?: React.MouseEvent) => void
  onSetPrimary?: (inventoryId: string, category: string) => void
  onReplaceSlot?: (inventoryId: string, category: string, slotIndex: number) => void
}

// Updated equipment slots with progression
const EQUIPMENT_SLOTS = {
  clothing: { name: 'CLOTHING', icon: GiShirt, layer_type: 'CLOTHING' },
  outerwear: { name: 'OUTERWEAR', icon: GiCloak, layer_type: 'OUTERWEAR' },
  face_accessory: { name: 'FACE_GEAR', icon: GiSunglasses, layer_type: 'FACE_ACCESSORY' },
  headwear: { name: 'HEADGEAR', icon: GiCrown, layer_type: 'HAT' },
  misc_accessory: { name: 'ACCESSORY', icon: GiGemNecklace, layer_type: 'ACCESSORY' },
  tool: { name: 'TOOL', icon: GiSpade, category: 'TOOL' },
} as const

// Calculate max slots based on character level
const getMaxSlotsForCategory = (characterLevel: number) => {
  return Math.min(1 + Math.floor(characterLevel / 5), 4)
}

// Get level requirement for next slot
const getLevelForSlot = (slotIndex: number) => {
  return (slotIndex - 1) * 5
}

// Item slot assignments
const getSlotForItem = (item: Character['inventory'][0]['item']) => {
  if (item.category === 'TOOL') return 'tool'

  switch (item.layer_type) {
    case 'CLOTHING': return 'clothing'
    case 'OUTERWEAR': return 'outerwear'
    case 'FACE_ACCESSORY': return 'face_accessory'
    case 'HAT': return 'headwear'
    case 'ACCESSORY': return 'misc_accessory'
    default: return null
  }
}

export function InventoryView({
  character,
  loadingItems,
  onUseItem,
  onEquipItem,
  onSetPrimary,
  onReplaceSlot
}: InventoryViewProps) {
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [equipCandidate, setEquipCandidate] = useState<{
    newItem: Character['inventory'][0]
    conflictingItem: Character['inventory'][0]
    targetSlot: string
    slotIndex: number
  } | null>(null)

  // Categorize inventory items for tabs
  const equipmentItems = character.inventory?.filter(inv =>
    ['HAT', 'CLOTHING', 'ACCESSORY', 'TOOL'].includes(inv.item.category) ||
    ['CLOTHING', 'OUTERWEAR', 'FACE_ACCESSORY', 'HAT', 'ACCESSORY'].includes(inv.item.layer_type)
  ) || []

  const consumableItems = character.inventory?.filter(inv =>
    inv.item.category === 'CONSUMABLE'
  ) || []

  const materialItems = character.inventory?.filter(inv =>
    inv.item.category === 'MATERIAL'
  ) || []

  // Get equipped items by category and slot
  const getEquippedByCategory = (category: string) => {
    return character.inventory?.filter(inv =>
      inv.is_equipped && inv.equipped_slot === category
    ).sort((a, b) => (a.slot_index || 1) - (b.slot_index || 1)) || []
  }

  // Get equipped item by specific slot
  const getEquippedBySlot = (category: string, slotIndex: number) => {
    return character.inventory?.find(inv =>
      inv.is_equipped && inv.equipped_slot === category && inv.slot_index === slotIndex
    )
  }

  // Enhanced equip handler with multi-slot support
  const handleEquipWithConflictCheck = (item: Character['inventory'][0], event?: React.MouseEvent) => {
    if (item.is_equipped) {
      // Simple unequip
      onEquipItem(item.id, true, undefined, event)
      return
    }

    // Determine target slot for this item
    const targetSlot = getSlotForItem(item.item)
    if (!targetSlot) {
      return
    }

    const maxSlots = getMaxSlotsForCategory(character.level)
    const equippedInCategory = getEquippedByCategory(targetSlot)

    // Check if there's an available slot
    let availableSlot = null
    for (let i = 1; i <= maxSlots; i++) {
      if (!getEquippedBySlot(targetSlot, i)) {
        availableSlot = i
        break
      }
    }

    if (availableSlot) {
      // Slot available, equip normally
      onEquipItem(item.id, false, targetSlot, event)
    } else {
      // All slots full, show replacement dialog for slot 1 (primary)
      const conflictingItem = getEquippedBySlot(targetSlot, 1)
      if (conflictingItem) {
        setEquipCandidate({
          newItem: item,
          conflictingItem: conflictingItem,
          targetSlot: targetSlot,
          slotIndex: 1
        })
        setShowReplaceDialog(true)
      }
    }
  }

  // Confirm replacement
  const confirmReplacement = () => {
    if (equipCandidate && onReplaceSlot) {
      onReplaceSlot(equipCandidate.newItem.id, equipCandidate.targetSlot, equipCandidate.slotIndex)
    }
    setShowReplaceDialog(false)
    setEquipCandidate(null)
  }

  // Handle setting item as primary
  const handleSetPrimary = (item: Character['inventory'][0]) => {
    if (onSetPrimary && item.equipped_slot) {
      onSetPrimary(item.id, item.equipped_slot)
    }
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HAT':
        return <GiTopHat />
      case 'CLOTHING':
        return <GiShirt />
      case 'ACCESSORY':
        return <GiNecklace />
      case 'TOOL':
        return <GiMining />
      case 'MATERIAL':
        return <GiRock />
      case 'CONSUMABLE':
        return <GiHealthPotion />
      default:
        return <GiCube />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'COMMON': return 'text-muted-foreground'
      case 'UNCOMMON': return 'text-green-500 dark:text-green-400'
      case 'RARE': return 'text-blue-500 dark:text-blue-400'
      case 'EPIC': return 'text-purple-500 dark:text-purple-400'
      case 'LEGENDARY': return 'text-yellow-500 dark:text-yellow-400'
      default: return 'text-muted-foreground'
    }
  }

  // Render multi-slot equipment grid
  const renderEquipmentSlots = () => {
    const maxSlots = getMaxSlotsForCategory(character.level)

    return (
      <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono mb-4">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="text-primary font-bold">EQUIPMENT MANIFEST v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              LVL.{character.level}
            </Badge>
            <Activity className="w-3 h-3 animate-pulse" />
            <span className="text-primary text-xs">ACTIVE</span>
          </div>
        </div>

        <Tabs defaultValue="clothing" className="w-full">
          {/* Equipment Category Tabs */}
          <div className="w-full overflow-x-auto">
            <TabsList className="flex w-max h-10 p-1 bg-muted/50">
              {Object.entries(EQUIPMENT_SLOTS).map(([categoryKey, slotConfig]) => {
                const equippedItems = getEquippedByCategory(categoryKey)
                const IconComponent = slotConfig.icon

                return (
                  <TabsTrigger
                    key={categoryKey}
                    value={categoryKey}
                    className="text-xs font-mono flex-shrink-0 px-3 flex items-center gap-2"
                  >
                    <IconComponent className="w-3 h-3" />
                    <span>{slotConfig.name}</span>
                    {equippedItems.length > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-1 rounded">
                        {equippedItems.length}
                      </span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {Object.entries(EQUIPMENT_SLOTS).map(([categoryKey, slotConfig]) => {
            const equippedItems = getEquippedByCategory(categoryKey)
            const unlockedSlots = maxSlots

            return (
              <TabsContent key={categoryKey} value={categoryKey} className="mt-4">
                {/* Category Status */}
                <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <slotConfig.icon className="w-4 h-4 text-primary" />
                      <span className="text-primary font-bold text-sm">{slotConfig.name}_MODULE</span>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {equippedItems.length}/{unlockedSlots}
                      </Badge>
                    </div>
                    {unlockedSlots < 4 && (
                      <div className="text-xs text-muted-foreground font-mono">
                        NEXT_UNLOCK: LVL.{getLevelForSlot(unlockedSlots + 1)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Equipment Slots */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }, (_, index) => {
                    const slotIndex = index + 1
                    const isUnlocked = slotIndex <= unlockedSlots
                    const equippedItem = getEquippedBySlot(categoryKey, slotIndex)

                    return renderSlot(
                      categoryKey,
                      slotIndex,
                      equippedItem,
                      isUnlocked,
                      slotConfig
                    )
                  })}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    )
  }

  const renderSlot = (
    category: string,
    slotIndex: number,
    equippedItem: Character['inventory'][0] | undefined,
    isUnlocked: boolean,
    slotConfig: any
  ) => {
    const isLoading = equippedItem ? loadingItems.has(equippedItem.id) : false
    const isPrimary = equippedItem?.is_primary || false

    if (!isUnlocked) {
      // Locked slot
      return (
        <div
          key={`${category}-${slotIndex}`}
          className="h-32 border-2 border-dashed border-muted-foreground/20 rounded bg-muted/10 flex flex-col items-center justify-center"
        >
          <Lock className="w-5 h-5 text-muted-foreground/50 mb-2" />
          <div className="text-xs text-muted-foreground/50 text-center font-mono">
            LOCKED<br />LVL.{getLevelForSlot(slotIndex)}
          </div>
        </div>
      )
    }

    if (!equippedItem) {
      // Empty unlocked slot
      return (
        <div
          key={`${category}-${slotIndex}`}
          className="h-32 border-2 border-dashed border-primary/30 rounded bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center"
        >
          <slotConfig.icon className="w-5 h-5 text-muted-foreground/50 mb-2" />
          <div className="text-xs text-muted-foreground text-center font-mono">
            SLOT_{slotIndex}<br />
            <span className="text-xs text-muted-foreground/70">EMPTY</span>
          </div>
        </div>
      )
    }

    // Equipped item slot
    return (
      <div
        key={`${category}-${slotIndex}`}
        className={`h-32 border-2 rounded p-3 transition-all ${isPrimary
          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20'
          : 'border-primary bg-primary/5'
          }`}
      >
        <div className="h-full flex flex-col items-center justify-between text-center">
          {/* Item Info */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {isPrimary && (
              <Crown className="w-3 h-3 text-yellow-500 mb-1" />
            )}
            <slotConfig.icon className={`w-5 h-5 mb-2 ${isPrimary ? 'text-yellow-600' : 'text-primary'}`} />
            <div className="text-xs font-bold font-mono truncate max-w-full leading-tight mb-1">
              {equippedItem.item.name.toUpperCase()}
            </div>
            <div className={`text-xs font-mono ${getRarityColor(equippedItem.item.rarity)}`}>
              {equippedItem.item.rarity}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-1">
            {!isPrimary && onSetPrimary && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSetPrimary(equippedItem)}
                className="w-full h-5 text-xs px-1 py-0 font-mono"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Star className="w-3 h-3" />
                )}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => onEquipItem(equippedItem.id, true, undefined, e)}
              className="w-full h-5 text-xs px-1 py-0 font-mono"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                'REMOVE'
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced renderInventoryItem with terminal styling
  const renderInventoryItem = (inv: Character['inventory'][0]) => {
    const isConsumable = inv.item.category === 'CONSUMABLE'
    const energy_effect = inv.item.energy_effect || 0
    const health_effect = inv.item.health_effect || 0

    const wouldWasteEnergy = energy_effect > 0 && character.energy >= 100
    const wouldWasteHealth = health_effect > 0 && character.health >= 100
    const wouldBeWasted = isConsumable && (
      (energy_effect > 0 && wouldWasteEnergy) ||
      (health_effect > 0 && wouldWasteHealth)
    )

    const isLoading = loadingItems.has(inv.id)
    const targetSlot = getSlotForItem(inv.item)
    const isEquippable = !!targetSlot

    return (
      <div key={inv.id} className="bg-muted/30 border border-primary/20 rounded p-3 font-mono">
        <div className="grid grid-cols-[40px_1fr_auto] gap-3 items-center">
          {/* Icon */}
          <div className="w-10 h-10 bg-muted/50 border border-primary/20 rounded flex items-center justify-center text-primary">
            {getCategoryIcon(inv.item.category)}
          </div>

          {/* Content */}
          <div className="min-w-0 overflow-hidden">
            <div className="font-bold text-primary flex items-center gap-2 mb-1">
              <span className="truncate text-sm">{inv.item.name.toUpperCase()}</span>
              {inv.is_equipped && (
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs font-mono flex items-center gap-1">
                    {inv.is_primary && <Crown className="w-3 h-3" />}
                    SLOT_{inv.slot_index}
                  </Badge>
                  {inv.is_primary && (
                    <Badge variant="default" className="text-xs bg-yellow-500 font-mono">
                      PRIMARY
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground mb-2 line-clamp-2">{inv.item.description}</div>

            {/* Show consumable effects */}
            {isConsumable && (energy_effect > 0 || health_effect > 0) && (
              <div className="text-xs text-green-500 mb-2 flex items-center gap-3 font-mono">
                {energy_effect > 0 && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    +{energy_effect}_ENERGY
                  </span>
                )}
                {health_effect > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    +{health_effect}_HEALTH
                  </span>
                )}
              </div>
            )}

            <div className={`text-xs font-mono ${getRarityColor(inv.item.rarity)}`}>
              {inv.item.rarity} • QTY:{inv.quantity}
              {targetSlot && ` • ${EQUIPMENT_SLOTS[targetSlot as keyof typeof EQUIPMENT_SLOTS]?.name}`}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-1 min-w-[80px]">
            {/* Equipment Button */}
            {isEquippable && (
              <Button
                type="button"
                size="sm"
                variant={inv.is_equipped ? "default" : "outline"}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEquipWithConflictCheck(inv, e)
                }}
                disabled={isLoading}
                className="text-xs px-2 py-1 h-6 w-full font-mono"
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  inv.is_equipped ? 'UNEQUIP' : 'EQUIP'
                )}
              </Button>
            )}

            {/* Set Primary Button for equipped non-primary items */}
            {inv.is_equipped && !inv.is_primary && onSetPrimary && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleSetPrimary(inv)}
                disabled={isLoading}
                className="text-xs px-2 py-1 h-6 w-full font-mono"
              >
                <Star className="w-3 h-3 mr-1" />
                PRIMARY
              </Button>
            )}

            {/* Use Button for Consumables */}
            {isConsumable && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onUseItem(
                    inv.id,
                    inv.item.name,
                    inv.item.energy_effect,
                    inv.item.health_effect,
                    e
                  )
                }}
                disabled={wouldBeWasted || isLoading}
                title={wouldBeWasted ?
                  `Already at full ${wouldWasteEnergy ? 'energy' : 'health'}` :
                  `Use ${inv.item.name}`
                }
                className="text-xs px-2 py-1 h-6 w-full font-mono"
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : wouldBeWasted ? 'FULL' : 'USE'}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono text-primary">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">STORAGE MANIFEST v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {character.inventory?.length || 0}_ITEMS
          </Badge>
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">CATALOGED</span>
        </div>
      </div>

      {/* Survivor Info */}
      <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-4">
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground">OPERATOR</div>
            <div className="text-primary font-bold">{character.name.toUpperCase()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">ACCESS_LVL</div>
            <div className="text-primary font-bold">LEVEL_{character.level}</div>
          </div>
          <div>
            <div className="text-muted-foreground">CAPACITY</div>
            <div className="text-primary font-bold">{character.inventory?.length || 0}/999</div>
          </div>
          <div>
            <div className="text-muted-foreground">STATUS</div>
            <div className="text-green-500 font-bold">AUTHORIZED</div>
          </div>
        </div>
      </div>

      {/* Main Inventory Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max h-10 p-1 bg-muted/50">
            <TabsTrigger value="all" className="text-xs font-mono flex-shrink-0 px-3">
              <GiCube className="w-3 h-3 mr-2" />
              <span>ALL_ITEMS</span>
              {character.inventory?.length > 0 && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-1 rounded">
                  {character.inventory.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="equipment" className="text-xs font-mono flex-shrink-0 px-3">
              <GiSpade className="w-3 h-3 mr-2" />
              <span>EQUIPMENT</span>
              {equipmentItems.length > 0 && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-1 rounded">
                  {equipmentItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="consumables" className="text-xs font-mono flex-shrink-0 px-3">
              <GiWaterBottle className="w-3 h-3 mr-2" />
              <span>CONSUMABLES</span>
              {consumableItems.length > 0 && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-1 rounded">
                  {consumableItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="materials" className="text-xs font-mono flex-shrink-0 px-3">
              <GiRock className="w-3 h-3 mr-2" />
              <span>MATERIALS</span>
              {materialItems.length > 0 && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-1 rounded">
                  {materialItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* All Tab Content */}
        <TabsContent value="all" className="mt-4">
          {renderEquipmentSlots()}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {character.inventory?.length > 0 ? (
                character.inventory.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center">
                  <GiBackpack className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-muted-foreground font-mono">
                    <div className="text-lg mb-2">STORAGE_EMPTY</div>
                    <div className="text-sm">ACQUIRE_RESOURCES_TO_POPULATE</div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Equipment Tab Content */}
        <TabsContent value="equipment" className="mt-4">
          {renderEquipmentSlots()}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {equipmentItems.length > 0 ? (
                equipmentItems.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center">
                  <GiSpade className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-muted-foreground font-mono">
                    <div className="text-lg mb-2">NO_EQUIPMENT_FOUND</div>
                    <div className="text-sm">ACCESS_TRADE_NETWORK</div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="consumables" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {consumableItems.length > 0 ? (
                consumableItems.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center">
                  <GiWaterBottle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-muted-foreground font-mono">
                    <div className="text-lg mb-2">NO_CONSUMABLES_FOUND</div>
                    <div className="text-sm">ACQUIRE_SUPPLIES_FOR_SURVIVAL</div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {materialItems.length > 0 ? (
                materialItems.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center">
                  <GiRock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-muted-foreground font-mono">
                    <div className="text-lg mb-2">NO_MATERIALS_FOUND</div>
                    <div className="text-sm">INITIATE_EXTRACTION_PROTOCOL</div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Equipment Replacement Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent className="sm:max-w-md font-mono">
          <DialogHeader>
            <DialogTitle className="font-mono">EQUIPMENT_CONFLICT_DETECTED</DialogTitle>
            <DialogDescription className="font-mono">
              ALL_SLOTS_OCCUPIED - REPLACEMENT_REQUIRED
            </DialogDescription>
          </DialogHeader>

          {equipCandidate && (
            <div className="space-y-4">
              <Alert className="border-yellow-500/50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-mono text-xs">
                  INSTALLING <strong>{equipCandidate.newItem.item.name.toUpperCase()}</strong> WILL_REPLACE{' '}
                  <strong>{equipCandidate.conflictingItem.item.name.toUpperCase()}</strong> IN_SLOT_{equipCandidate.slotIndex}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-red-500 mb-2 font-mono">REMOVING:</h4>
                  <div className="border border-red-500/50 rounded p-2 bg-red-950/20">
                    <div className="font-bold font-mono">{equipCandidate.conflictingItem.item.name.toUpperCase()}</div>
                    <div className="text-muted-foreground font-mono">
                      {equipCandidate.conflictingItem.item.rarity} • SLOT_{equipCandidate.slotIndex}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-green-500 mb-2 font-mono">INSTALLING:</h4>
                  <div className="border border-green-500/50 rounded p-2 bg-green-950/20">
                    <div className="font-bold font-mono">{equipCandidate.newItem.item.name.toUpperCase()}</div>
                    <div className="text-muted-foreground font-mono">
                      {equipCandidate.newItem.item.rarity}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)} className="font-mono">
              CANCEL
            </Button>
            <Button onClick={confirmReplacement} className="font-mono">
              CONFIRM_REPLACEMENT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 mt-4 flex justify-between text-xs text-muted-foreground/60">
        <span>STORAGE_MANIFEST_v2089 | REAL_TIME_INVENTORY</span>
        <span>LAST_SCAN: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
