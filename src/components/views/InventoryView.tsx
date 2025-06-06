// Updated InventoryView.tsx with 6-slot equipment system

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Zap, Heart, AlertTriangle } from 'lucide-react'
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
  onUseItem: (inventoryId: string, itemName: string, energyEffect?: number, healthEffect?: number) => void
  onEquipItem: (inventoryId: string, isEquipped: boolean, targetSlot?: string) => void
}

// Updated 6-slot equipment mapping
const EQUIPMENT_SLOTS = {
  clothing: { name: 'Clothing', icon: GiShirt, layerType: 'CLOTHING' },
  outerwear: { name: 'Outerwear', icon: GiCloak, layerType: 'OUTERWEAR' },
  face_accessory: { name: 'Face', icon: GiSunglasses, layerType: 'FACE_ACCESSORY' },
  headwear: { name: 'Head', icon: GiCrown, layerType: 'HAT' },
  misc_accessory: { name: 'Accessory', icon: GiGemNecklace, layerType: 'ACCESSORY' },
  tool: { name: 'Tool', icon: GiSpade, category: 'TOOL' },
} as const

// Item slot assignments - which slot each item type can go in
const getSlotForItem = (item: Character['inventory'][0]['item']) => {
  // Tools use category, others use layerType
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
  onEquipItem
}: InventoryViewProps) {
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [equipCandidate, setEquipCandidate] = useState<{
    newItem: Character['inventory'][0]
    conflictingItem: Character['inventory'][0]
    targetSlot: string
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

  // Get equipped item by slot using equippedSlot field
  const getEquippedBySlot = (slot: string) => {
    return character.inventory?.find(inv =>
      inv.isEquipped && inv.equippedSlot === slot
    )
  }

  // Enhanced equip handler with 6-slot conflict detection
  const handleEquipWithConflictCheck = (item: Character['inventory'][0]) => {
    if (item.isEquipped) {
      // Simple unequip
      onEquipItem(item.id, true)
      return
    }

    // Determine target slot for this item
    const targetSlot = getSlotForItem(item.item)
    if (!targetSlot) {
      // Not an equippable item
      return
    }

    // Check if slot is occupied
    const conflictingItem = getEquippedBySlot(targetSlot)

    if (conflictingItem && conflictingItem.id !== item.id) {
      // Show replacement dialog
      setEquipCandidate({
        newItem: item,
        conflictingItem: conflictingItem,
        targetSlot: targetSlot
      })
      setShowReplaceDialog(true)
    } else {
      // No conflict, equip normally
      onEquipItem(item.id, false, targetSlot)
    }
  }

  // Confirm replacement
  const confirmReplacement = () => {
    if (equipCandidate) {
      // First unequip the conflicting item
      onEquipItem(equipCandidate.conflictingItem.id, true)

      // Small delay to ensure unequip completes, then equip new item
      setTimeout(() => {
        onEquipItem(equipCandidate.newItem.id, false, equipCandidate.targetSlot)
      }, 100)
    }
    setShowReplaceDialog(false)
    setEquipCandidate(null)
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

  // Render 6-slot equipment grid
  const renderEquipmentSlots = () => (
    <div className="bg-muted/30 p-3 rounded-lg mb-4">
      <h4 className="font-medium mb-3 text-sm">Equipment</h4>

      {/* Desktop: 2x3 grid */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-3">
        {/* Top row */}
        {renderSlot('face_accessory')}
        {renderSlot('headwear')}
        {renderSlot('tool')}

        {/* Bottom row */}
        {renderSlot('clothing')}
        {renderSlot('outerwear')}
        {renderSlot('misc_accessory')}
      </div>

      {/* Mobile: Horizontal scroll */}
      <ScrollArea className="w-full sm:hidden">
        <div className="flex gap-3 pb-2">
          {Object.entries(EQUIPMENT_SLOTS).map(([slotKey]) =>
            renderSlot(slotKey, true)
          )}
        </div>
      </ScrollArea>
    </div>
  )

  const renderSlot = (slotKey: string, isMobile = false) => {
    const slotConfig = EQUIPMENT_SLOTS[slotKey as keyof typeof EQUIPMENT_SLOTS]
    if (!slotConfig) return null

    const equippedItem = getEquippedBySlot(slotKey)
    const IconComponent = slotConfig.icon

    const slotClass = isMobile ? 'flex-shrink-0 w-20' : 'w-full'

    return (
      <div
        key={slotKey}
        className={`${slotClass} border-2 border-dashed rounded-lg p-2 text-center transition-colors ${equippedItem
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/30 bg-muted/20'
          }`}
      >
        <div className="flex flex-col items-center gap-1">
          <IconComponent className={`w-5 h-5 ${equippedItem ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="text-xs font-medium">{slotConfig.name}</div>
          {equippedItem ? (
            <div className="text-xs text-center">
              <div className="font-medium text-primary truncate max-w-full">
                {equippedItem.item.name}
              </div>
              <div className="text-muted-foreground capitalize">
                {equippedItem.item.rarity}
              </div>
              {!isMobile && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEquipItem(equippedItem.id, true)}
                  className="mt-1 h-6 text-xs px-1"
                  disabled={loadingItems.has(equippedItem.id)}
                >
                  {loadingItems.has(equippedItem.id) ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    'Remove'
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Empty</div>
          )}
        </div>
      </div>
    )
  }

  // Enhanced renderInventoryItem with 6-slot support
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
      <div key={inv.id} className="grid grid-cols-[40px_1fr_80px] gap-3 p-3 bg-muted/50 rounded-lg items-center">
        {/* Icon */}
        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-sm">
          {getCategoryIcon(inv.item.category)}
        </div>

        {/* Content */}
        <div className="min-w-0 overflow-hidden">
          <div className="font-medium flex items-center gap-2 mb-1">
            <span className="truncate">{inv.item.name}</span>
            {inv.isEquipped && (
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                Equipped
              </span>
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
            {targetSlot && ` • Slot: ${EQUIPMENT_SLOTS[targetSlot as keyof typeof EQUIPMENT_SLOTS]?.name}`}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-1 w-20">
          {/* Equipment Button with 6-slot conflict checking */}
          {isEquippable && (
            <Button
              type="button"
              size="sm"
              variant={inv.isEquipped ? "default" : "outline"}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleEquipWithConflictCheck(inv)
              }}
              disabled={isLoading}
              className="text-xs px-1 py-1 h-7 w-full"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                inv.isEquipped ? 'Unequip' : 'Equip'
              )}
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
                  inv.item.healthEffect
                )
              }}
              disabled={wouldBeWasted || isLoading}
              title={wouldBeWasted ?
                `Already at full ${wouldWasteEnergy ? 'energy' : 'health'}` :
                `Use ${inv.item.name}`
              }
              className="text-xs px-1 py-1 h-7 w-full"
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
        <div className="text-sm text-muted-foreground">
          {character.inventory?.length || 0} items
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
          {equipmentItems.length > 0 && renderEquipmentSlots()}
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
          {equipmentItems.length > 0 && renderEquipmentSlots()}
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

        {/* Consumables Tab Content */}
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

        {/* Materials Tab Content */}
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
              This slot is already occupied. Do you want to replace the current item?
            </DialogDescription>
          </DialogHeader>

          {equipCandidate && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Equipping <strong>{equipCandidate.newItem.item.name}</strong> will replace{' '}
                  <strong>{equipCandidate.conflictingItem.item.name}</strong> in your{' '}
                  <strong>{EQUIPMENT_SLOTS[equipCandidate.targetSlot as keyof typeof EQUIPMENT_SLOTS]?.name}</strong> slot.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-red-600 mb-2">Removing:</h4>
                  <div className="border rounded p-2 bg-red-50 dark:bg-red-950/20">
                    <div className="font-medium">{equipCandidate.conflictingItem.item.name}</div>
                    <div className="text-muted-foreground capitalize">
                      {equipCandidate.conflictingItem.item.rarity}
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
