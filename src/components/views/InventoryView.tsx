// Updated InventoryView.tsx with Multi-Slot Equipment System

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Zap, Heart, AlertTriangle, Star, Lock, Crown } from 'lucide-react'
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
  onUseItem: (inventoryId: string, itemName: string, energyEffect?: number, healthEffect?: number, event?: React.MouseEvent) => void
  onEquipItem: (inventoryId: string, isEquipped: boolean, targetSlot?: string, event?: React.MouseEvent) => void
  onSetPrimary?: (inventoryId: string, category: string) => void // NEW: Set item as primary
  onReplaceSlot?: (inventoryId: string, category: string, slotIndex: number) => void // NEW: Replace specific slot
}

// Updated equipment slots with progression
const EQUIPMENT_SLOTS = {
  clothing: { name: 'Clothing', icon: GiShirt, layerType: 'CLOTHING' },
  outerwear: { name: 'Outerwear', icon: GiCloak, layerType: 'OUTERWEAR' },
  face_accessory: { name: 'Face', icon: GiSunglasses, layerType: 'FACE_ACCESSORY' },
  headwear: { name: 'Head', icon: GiCrown, layerType: 'HAT' },
  misc_accessory: { name: 'Accessory', icon: GiGemNecklace, layerType: 'ACCESSORY' },
  tool: { name: 'Tool', icon: GiSpade, category: 'TOOL' },
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

  switch (item.layerType) {
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
    ['CLOTHING', 'OUTERWEAR', 'FACE_ACCESSORY', 'HAT', 'ACCESSORY'].includes(inv.item.layerType)
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
      inv.isEquipped && inv.equippedslot === category
    ).sort((a, b) => (a.slot_index || 1) - (b.slot_index || 1)) || []
  }

  // Get equipped item by specific slot
  const getEquippedBySlot = (category: string, slotIndex: number) => {
    return character.inventory?.find(inv =>
      inv.isEquipped && inv.equippedslot === category && inv.slot_index === slotIndex
    )
  }

  // Enhanced equip handler with multi-slot support
  const handleEquipWithConflictCheck = (item: Character['inventory'][0], event?: React.MouseEvent) => {
    if (item.isEquipped) {
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
    if (onSetPrimary && item.equippedslot) {
      onSetPrimary(item.id, item.equippedslot)
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

  // Render multi-slot equipment grid
  const renderEquipmentSlots = () => {
    const maxSlots = getMaxSlotsForCategory(character.level)

    return (
      <div className="bg-muted/30 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <GiSpade className="w-4 h-4" />
            Equipment
            <Badge variant="outline" className="text-xs">
              Level {character.level}
            </Badge>
          </h4>
        </div>

        <Tabs defaultValue="clothing" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-8">
            {Object.entries(EQUIPMENT_SLOTS).map(([categoryKey, slotConfig]) => {
              const equippedItems = getEquippedByCategory(categoryKey)
              const IconComponent = slotConfig.icon

              return (
                <TabsTrigger
                  key={categoryKey}
                  value={categoryKey}
                  className="text-xs p-1 flex flex-col items-center gap-0.5"
                >
                  <IconComponent className="w-3 h-3" />
                  <span className="text-[10px] leading-none">{slotConfig.name}</span>
                  {equippedItems.length > 0 && (
                    <span className="text-[8px] bg-primary/20 text-primary px-1 rounded">
                      {equippedItems.length}
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {Object.entries(EQUIPMENT_SLOTS).map(([categoryKey, slotConfig]) => {
            const equippedItems = getEquippedByCategory(categoryKey)
            const unlockedSlots = maxSlots

            return (
              <TabsContent key={categoryKey} value={categoryKey} className="mt-3">
                {/* Category Info Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <slotConfig.icon className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{slotConfig.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {equippedItems.length}/{unlockedSlots}
                    </Badge>
                  </div>
                  {unlockedSlots < 4 && (
                    <div className="text-xs text-muted-foreground">
                      Next: Level {getLevelForSlot(unlockedSlots + 1)}
                    </div>
                  )}
                </div>

                {/* Slots Grid - 2x2 for better mobile fit */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      // Locked slot - more compact
      return (
        <div
          key={`${category}-${slotIndex}`}
          className="aspect-square border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center bg-muted/10 min-h-[80px]"
        >
          <Lock className="w-4 h-4 text-muted-foreground/50 mb-1" />
          <div className="text-xs text-muted-foreground/50 text-center leading-tight">
            Level<br />{getLevelForSlot(slotIndex)}
          </div>
        </div>
      )
    }

    if (!equippedItem) {
      // Empty unlocked slot - more compact
      return (
        <div
          key={`${category}-${slotIndex}`}
          className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/30 transition-colors min-h-[80px]"
        >
          <slotConfig.icon className="w-4 h-4 text-muted-foreground/50 mb-1" />
          <div className="text-xs text-muted-foreground text-center leading-tight">
            Slot {slotIndex}<br />
            <span className="text-xs text-muted-foreground/70">Empty</span>
          </div>
        </div>
      )
    }

    // Equipped item slot - more compact
    return (
      <div
        key={`${category}-${slotIndex}`}
        className={`aspect-square border-2 rounded-lg p-2 transition-all min-h-[80px] ${isPrimary
          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20'
          : 'border-primary bg-primary/5'
          }`}
      >
        <div className="h-full flex flex-col items-center justify-between text-center">
          {/* Item Info - more compact */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {isPrimary && (
              <Crown className="w-3 h-3 text-yellow-500 mb-1" />
            )}
            <slotConfig.icon className={`w-4 h-4 mb-1 ${isPrimary ? 'text-yellow-600' : 'text-primary'}`} />
            <div className="text-xs font-medium truncate max-w-full leading-tight">
              {equippedItem.item.name}
            </div>
            <div className="text-[10px] text-muted-foreground capitalize">
              {equippedItem.item.rarity}
            </div>
          </div>

          {/* Compact Action Buttons */}
          <div className="w-full space-y-1">
            {!isPrimary && onSetPrimary && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSetPrimary(equippedItem)}
                className="w-full h-5 text-[10px] px-1 py-0"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-2 h-2 animate-spin" />
                ) : (
                  <>⭐</>
                )}
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => onEquipItem(equippedItem.id, true, undefined, e)}
              className="w-full h-5 text-[10px] px-1 py-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-2 h-2 animate-spin" />
              ) : (
                '×'
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced renderInventoryItem with slot info
  const renderInventoryItem = (inv: Character['inventory'][0]) => {
    const isConsumable = inv.item.category === 'CONSUMABLE'
    const energyEffect = inv.item.energyEffect || 0
    const healthEffect = inv.item.healthEffect || 0

    const wouldWasteEnergy = energyEffect > 0 && character.energy >= 100
    const wouldWasteHealth = healthEffect > 0 && character.health >= 100
    const wouldBeWasted = isConsumable && (
      (energyEffect > 0 && wouldWasteEnergy) ||
      (healthEffect > 0 && wouldWasteHealth)
    )

    const isLoading = loadingItems.has(inv.id)
    const targetSlot = getSlotForItem(inv.item)
    const isEquippable = !!targetSlot

    return (
      <div key={inv.id} className="grid grid-cols-[40px_1fr_100px] gap-3 p-3 bg-muted/50 rounded-lg items-center">
        {/* Icon */}
        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-sm">
          {getCategoryIcon(inv.item.category)}
        </div>

        {/* Content */}
        <div className="min-w-0 overflow-hidden">
          <div className="font-medium flex items-center gap-2 mb-1">
            <span className="truncate">{inv.item.name}</span>
            {inv.isEquipped && (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  {inv.is_primary && <Crown className="w-3 h-3" />}
                  Slot {inv.slot_index}
                </Badge>
                {inv.is_primary && (
                  <Badge variant="default" className="text-xs bg-yellow-500">
                    Primary
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground truncate">{inv.item.description}</div>

          {/* Show consumable effects */}
          {isConsumable && (energyEffect > 0 || healthEffect > 0) && (
            <div className="text-xs text-green-600 mt-1 flex items-center gap-2">
              {energyEffect > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  +{energyEffect}
                </span>
              )}
              {healthEffect > 0 && (
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  +{healthEffect}
                </span>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground capitalize mt-1 truncate">
            {inv.item.rarity} • Qty: {inv.quantity}
            {targetSlot && ` • ${EQUIPMENT_SLOTS[targetSlot as keyof typeof EQUIPMENT_SLOTS]?.name}`}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-1 w-24">
          {/* Equipment Button */}
          {isEquippable && (
            <Button
              type="button"
              size="sm"
              variant={inv.isEquipped ? "default" : "outline"}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleEquipWithConflictCheck(inv, e)
              }}
              disabled={isLoading}
              className="text-xs px-2 py-1 h-7 w-full"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                inv.isEquipped ? 'Unequip' : 'Equip'
              )}
            </Button>
          )}

          {/* Set Primary Button for equipped non-primary items */}
          {inv.isEquipped && !inv.is_primary && onSetPrimary && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleSetPrimary(inv)}
              disabled={isLoading}
              className="text-xs px-2 py-1 h-6 w-full"
            >
              <Star className="w-3 h-3 mr-1" />
              Primary
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
                  inv.item.energyEffect,
                  inv.item.healthEffect,
                  e
                )
              }}
              disabled={wouldBeWasted || isLoading}
              title={wouldBeWasted ?
                `Already at full ${wouldWasteEnergy ? 'energy' : 'health'}` :
                `Use ${inv.item.name}`
              }
              className="text-xs px-2 py-1 h-7 w-full"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : wouldBeWasted ? 'Full' : 'Use'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <GiBackpack />
          Inventory
        </h3>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <span>{character.inventory?.length || 0} items</span>
          <Badge variant="outline">Level {character.level}</Badge>
        </div>
      </div>

      {/* Tabs with updated counts */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="text-xs">
            <GiCube className="w-3 h-3 mr-1" />
            All
            {character.inventory?.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                {character.inventory.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="equipment" className="text-xs">
            <GiSpade className="w-3 h-3 mr-1" />
            Gear
            {equipmentItems.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                {equipmentItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="consumables" className="text-xs">
            <GiWaterBottle className="w-3 h-3 mr-1" />
            Use
            {consumableItems.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                {consumableItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="materials" className="text-xs">
            <GiRock className="w-3 h-3 mr-1" />
            Mats
            {materialItems.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                {materialItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Tab Content */}
        <TabsContent value="all" className="mt-4">
          {renderEquipmentSlots()}
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {character.inventory?.length > 0 ? (
                character.inventory.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/50 p-8 rounded-lg text-center text-muted-foreground">
                  <GiBackpack className="w-12 h-12 mx-auto mb-2" />
                  Your bag is empty.<br />Start mining or visit the market!
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Equipment Tab Content */}
        <TabsContent value="equipment" className="mt-4">
          {renderEquipmentSlots()}
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {equipmentItems.length > 0 ? (
                equipmentItems.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/50 p-8 rounded-lg text-center text-muted-foreground">
                  <GiSpade className="w-12 h-12 mx-auto mb-2" />
                  No equipment items found.<br />Try mining or visit the market!
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Other tabs remain the same */}
        <TabsContent value="consumables" className="mt-4">
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {consumableItems.length > 0 ? (
                consumableItems.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/50 p-8 rounded-lg text-center text-muted-foreground">
                  <GiWaterBottle className="w-12 h-12 mx-auto mb-2" />
                  No consumable items found.<br />Visit the market for energy drinks!
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="materials" className="mt-4">
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {materialItems.length > 0 ? (
                materialItems.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/50 p-8 rounded-lg text-center text-muted-foreground">
                  <GiRock className="w-12 h-12 mx-auto mb-2" />
                  No material items found.<br />Go mining to find materials!
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Equipment Replacement Dialog */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Equipment?</DialogTitle>
            <DialogDescription>
              All slots in this category are full. Replace an item?
            </DialogDescription>
          </DialogHeader>

          {equipCandidate && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Equipping <strong>{equipCandidate.newItem.item.name}</strong> will replace{' '}
                  <strong>{equipCandidate.conflictingItem.item.name}</strong> in slot {equipCandidate.slotIndex}.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-red-600 mb-2">Removing:</h4>
                  <div className="border rounded p-2 bg-red-50 dark:bg-red-950/20">
                    <div className="font-medium">{equipCandidate.conflictingItem.item.name}</div>
                    <div className="text-muted-foreground capitalize">
                      {equipCandidate.conflictingItem.item.rarity} • Slot {equipCandidate.slotIndex}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-green-600 mb-2">Equipping:</h4>
                  <div className="border rounded p-2 bg-green-50 dark:bg-green-950/20">
                    <div className="font-medium">{equipCandidate.newItem.item.name}</div>
                    <div className="text-muted-foreground capitalize">
                      {equipCandidate.newItem.item.rarity}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReplacement}>
              Replace Equipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
