// Updated InventoryView.tsx with Better Responsive Design

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
  onSetPrimary?: (inventoryId: string, category: string) => void
  onReplaceSlot?: (inventoryId: string, category: string, slotIndex: number) => void
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

  // Render multi-slot equipment grid with improved spacing
  const renderEquipmentSlots = () => {
    const maxSlots = getMaxSlotsForCategory(character.level)

    return (
      <div className="bg-muted/30 p-4 sm:p-6 rounded-lg mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-base flex items-center gap-2">
            <GiSpade className="w-5 h-5" />
            Equipment
            <Badge variant="outline" className="text-sm">
              Level {character.level}
            </Badge>
          </h4>
        </div>

        <Tabs defaultValue="clothing" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1">
            {Object.entries(EQUIPMENT_SLOTS).map(([categoryKey, slotConfig]) => {
              const equippedItems = getEquippedByCategory(categoryKey)
              const IconComponent = slotConfig.icon

              return (
                <TabsTrigger
                  key={categoryKey}
                  value={categoryKey}
                  className="text-xs sm:text-sm p-2 sm:p-3 flex flex-col items-center gap-1 h-auto"
                >
                  <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-xs leading-none hidden sm:block">{slotConfig.name}</span>
                  <span className="text-xs leading-none sm:hidden">
                    {slotConfig.name.length > 4 ? slotConfig.name.slice(0, 4) : slotConfig.name}
                  </span>
                  {equippedItems.length > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
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
              <TabsContent key={categoryKey} value={categoryKey} className="mt-4">
                {/* Category Info Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <slotConfig.icon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-base">{slotConfig.name}</span>
                    <Badge variant="secondary" className="text-sm">
                      {equippedItems.length}/{unlockedSlots}
                    </Badge>
                  </div>
                  {unlockedSlots < 4 && (
                    <div className="text-sm text-muted-foreground">
                      Next: Level {getLevelForSlot(unlockedSlots + 1)}
                    </div>
                  )}
                </div>

                {/* Improved Slots Grid - Single row on mobile, 2x2 on larger screens */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
      // Locked slot - improved size
      return (
        <div
          key={`${category}-${slotIndex}`}
          className="aspect-square border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center bg-muted/10 min-h-[100px] sm:min-h-[120px]"
        >
          <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/50 mb-2" />
          <div className="text-sm text-muted-foreground/50 text-center leading-tight">
            Level<br />{getLevelForSlot(slotIndex)}
          </div>
        </div>
      )
    }

    if (!equippedItem) {
      // Empty unlocked slot - improved size
      return (
        <div
          key={`${category}-${slotIndex}`}
          className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/30 transition-colors min-h-[100px] sm:min-h-[120px]"
        >
          <slotConfig.icon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/50 mb-2" />
          <div className="text-sm text-muted-foreground text-center leading-tight">
            Slot {slotIndex}<br />
            <span className="text-xs text-muted-foreground/70">Empty</span>
          </div>
        </div>
      )
    }

    // Equipped item slot - improved size and layout
    return (
      <div
        key={`${category}-${slotIndex}`}
        className={`aspect-square border-2 rounded-lg p-3 transition-all min-h-[100px] sm:min-h-[120px] ${isPrimary
          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20'
          : 'border-primary bg-primary/5'
          }`}
      >
        <div className="h-full flex flex-col items-center justify-between text-center">
          {/* Item Info - better sized */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {isPrimary && (
              <Crown className="w-4 h-4 text-yellow-500 mb-1" />
            )}
            <slotConfig.icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-2 ${isPrimary ? 'text-yellow-600' : 'text-primary'}`} />
            <div className="text-sm font-medium truncate max-w-full leading-tight mb-1">
              {equippedItem.item.name}
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {equippedItem.item.rarity}
            </div>
          </div>

          {/* Action Buttons - better sized */}
          <div className="w-full space-y-1">
            {!isPrimary && onSetPrimary && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSetPrimary(equippedItem)}
                className="w-full h-6 text-xs px-2 py-0"
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
              className="w-full h-6 text-xs px-2 py-0"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                'Remove'
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced renderInventoryItem with better mobile layout
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
      <div key={inv.id} className="grid grid-cols-[50px_1fr_auto] gap-3 sm:gap-4 p-4 sm:p-5 bg-muted/50 rounded-lg items-center">
        {/* Icon - larger */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-muted rounded-lg flex items-center justify-center text-lg">
          {getCategoryIcon(inv.item.category)}
        </div>

        {/* Content - improved spacing */}
        <div className="min-w-0 overflow-hidden">
          <div className="font-medium flex items-center gap-2 mb-2">
            <span className="truncate text-base">{inv.item.name}</span>
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
          <div className="text-sm text-muted-foreground mb-2 line-clamp-2">{inv.item.description}</div>

          {/* Show consumable effects */}
          {isConsumable && (energyEffect > 0 || healthEffect > 0) && (
            <div className="text-sm text-green-600 mb-2 flex items-center gap-3">
              {energyEffect > 0 && (
                <span className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  +{energyEffect}
                </span>
              )}
              {healthEffect > 0 && (
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  +{healthEffect}
                </span>
              )}
            </div>
          )}

          <div className="text-sm text-muted-foreground capitalize">
            {inv.item.rarity} • Qty: {inv.quantity}
            {targetSlot && ` • ${EQUIPMENT_SLOTS[targetSlot as keyof typeof EQUIPMENT_SLOTS]?.name}`}
          </div>
        </div>

        {/* Buttons - improved layout */}
        <div className="flex flex-col gap-2 min-w-[100px]">
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
              className="text-sm px-3 py-2 h-8 w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
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
              className="text-sm px-3 py-1 h-7 w-full"
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
              className="text-sm px-3 py-2 h-8 w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : wouldBeWasted ? 'Full' : 'Use'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <GiBackpack className="w-6 h-6" />
          Inventory
        </h3>
        <div className="text-sm sm:text-base text-muted-foreground flex items-center gap-2">
          <span>{character.inventory?.length || 0} items</span>
          <Badge variant="outline">Level {character.level}</Badge>
        </div>
      </div>

      {/* Tabs with improved sizing */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="all" className="text-sm">
            <GiCube className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">All</span>
            <span className="sm:hidden">All</span>
            {character.inventory?.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                {character.inventory.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="equipment" className="text-sm">
            <GiSpade className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Equipment</span>
            <span className="sm:hidden">Gear</span>
            {equipmentItems.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                {equipmentItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="consumables" className="text-sm">
            <GiWaterBottle className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Consumables</span>
            <span className="sm:hidden">Use</span>
            {consumableItems.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                {consumableItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="materials" className="text-sm">
            <GiRock className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Materials</span>
            <span className="sm:hidden">Mats</span>
            {materialItems.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                {materialItems.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Tab Content */}
        <TabsContent value="all" className="mt-4 sm:mt-6">
          {renderEquipmentSlots()}
          <ScrollArea className="h-[500px] sm:h-[600px]">
            <div className="space-y-3">
              {character.inventory?.length > 0 ? (
                character.inventory.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/50 p-8 sm:p-12 rounded-lg text-center text-muted-foreground">
                  <GiBackpack className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4" />
                  <div className="text-lg sm:text-xl mb-2">Your bag is empty</div>
                  <div className="text-sm sm:text-base">Start mining or visit the market!</div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Equipment Tab Content */}
        <TabsContent value="equipment" className="mt-4 sm:mt-6">
          {renderEquipmentSlots()}
          <ScrollArea className="h-[500px] sm:h-[600px]">
            <div className="space-y-3">
              {equipmentItems.length > 0 ? (
                equipmentItems.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/50 p-8 sm:p-12 rounded-lg text-center text-muted-foreground">
                  <GiSpade className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4" />
                  <div className="text-lg sm:text-xl mb-2">No equipment items found</div>
                  <div className="text-sm sm:text-base">Try mining or visit the market!</div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Other tabs with improved empty states */}
        <TabsContent value="consumables" className="mt-4 sm:mt-6">
          <ScrollArea className="h-[500px] sm:h-[600px]">
            <div className="space-y-3">
              {consumableItems.length > 0 ? (
                consumableItems.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/50 p-8 sm:p-12 rounded-lg text-center text-muted-foreground">
                  <GiWaterBottle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4" />
                  <div className="text-lg sm:text-xl mb-2">No consumable items found</div>
                  <div className="text-sm sm:text-base">Visit the market for energy drinks!</div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="materials" className="mt-4 sm:mt-6">
          <ScrollArea className="h-[500px] sm:h-[600px]">
            <div className="space-y-3">
              {materialItems.length > 0 ? (
                materialItems.map(renderInventoryItem)
              ) : (
                <div className="bg-muted/50 p-8 sm:p-12 rounded-lg text-center text-muted-foreground">
                  <GiRock className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4" />
                  <div className="text-lg sm:text-xl mb-2">No material items found</div>
                  <div className="text-sm sm:text-base">Go mining to find materials!</div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Equipment Replacement Dialog - unchanged but improved sizing */}
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
