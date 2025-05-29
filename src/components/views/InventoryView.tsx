// src/components/views/InventoryView.tsx - Enhanced version
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Backpack, Loader2, Shield, Crown, Shirt, Gem, Package, Zap, Heart } from 'lucide-react'
import type { Character } from '@/types'

interface InventoryViewProps {
  character: Character
  loadingItems: Set<string>
  onBack: () => void
  onUseItem: (inventoryId: string, itemName: string, energyEffect?: number, healthEffect?: number) => void
  onEquipItem: (inventoryId: string, isEquipped: boolean) => void
}

type InventoryTab = 'equipment' | 'consumables' | 'materials' | 'all'

// Equipment slot mapping
const EQUIPMENT_SLOTS = {
  HAT: { name: 'Head', icon: Crown, slot: 'head' },
  CLOTHING: { name: 'Body', icon: Shirt, slot: 'body' },
  ACCESSORY: { name: 'Accessory', icon: Gem, slot: 'accessory' },
  TOOL: { name: 'Tool', icon: Shield, slot: 'tool' },
} as const

export function InventoryView({
  character,
  loadingItems,
  onBack,
  onUseItem,
  onEquipItem
}: InventoryViewProps) {
  const [activeTab, setActiveTab] = useState<InventoryTab>('all')

  // Categorize inventory items
  const equipmentItems = character.inventory?.filter(inv =>
    ['HAT', 'CLOTHING', 'ACCESSORY', 'TOOL'].includes(inv.item.category)
  ) || []

  const consumableItems = character.inventory?.filter(inv =>
    inv.item.category === 'CONSUMABLE'
  ) || []

  const materialItems = character.inventory?.filter(inv =>
    inv.item.category === 'MATERIAL'
  ) || []

  // Get items based on active tab
  const getActiveItems = () => {
    switch (activeTab) {
      case 'equipment': return equipmentItems
      case 'consumables': return consumableItems
      case 'materials': return materialItems
      case 'all': return character.inventory || []
      default: return character.inventory || []
    }
  }

  // Get equipped items by slot
  const getEquippedBySlot = (slot: string) => {
    return equipmentItems.find(inv =>
      inv.isEquipped && EQUIPMENT_SLOTS[inv.item.category as keyof typeof EQUIPMENT_SLOTS]?.slot === slot
    )
  }

  const renderEquipmentSlots = () => (
    <div className="bg-muted/30 p-4 rounded-lg mb-4">
      <h4 className="font-medium mb-3 text-sm">Equipment Slots</h4>
      <div className="grid grid-cols-2 gap-3">
        {/* @typescript-eslint/no-unused-vars */}
        {Object.entries(EQUIPMENT_SLOTS).map(([, config]) => {
          const equippedItem = getEquippedBySlot(config.slot)
          const IconComponent = config.icon

          return (
            <div
              key={config.slot}
              className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${equippedItem
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/30 bg-muted/20'
                }`}
            >
              <div className="flex flex-col items-center gap-1">
                <IconComponent className={`w-6 h-6 ${equippedItem ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-xs font-medium">{config.name}</div>
                {equippedItem ? (
                  <div className="text-xs text-center">
                    <div className="font-medium text-primary">{equippedItem.item.name}</div>
                    <div className="text-muted-foreground capitalize">{equippedItem.item.rarity}</div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Empty</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

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

    return (
      <div key={inv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-sm">
            {inv.item.category === 'HAT' ? '🎩' :
              inv.item.category === 'CLOTHING' ? '👕' :
                inv.item.category === 'ACCESSORY' ? '💎' :
                  inv.item.category === 'TOOL' ? '🔧' :
                    inv.item.category === 'MATERIAL' ? '⚡' :
                      inv.item.category === 'CONSUMABLE' ? '🥤' : '📦'}
          </div>
          <div className="flex-1">
            <div className="font-medium flex items-center gap-2">
              {inv.item.name}
              {inv.isEquipped && (
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-1.5 py-0.5 rounded-full">
                  Equipped
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">{inv.item.description}</div>

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

            <div className="text-xs text-muted-foreground capitalize mt-1">
              {inv.item.rarity} • Qty: {inv.quantity}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {/* Equipment Button */}
          {['HAT', 'CLOTHING', 'ACCESSORY', 'TOOL'].includes(inv.item.category) && (
            <Button
              size="sm"
              variant={inv.isEquipped ? "default" : "outline"}
              onClick={() => onEquipItem(inv.id, inv.isEquipped)}
              disabled={isLoading}
              className="text-xs px-2 py-1"
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
              size="sm"
              variant="outline"
              onClick={() => onUseItem(
                inv.id,
                inv.item.name,
                inv.item.energyEffect,
                inv.item.healthEffect
              )}
              disabled={wouldBeWasted || isLoading}
              title={wouldBeWasted ?
                `Already at full ${wouldWasteEnergy ? 'energy' : 'health'}` :
                `Use ${inv.item.name}`
              }
              className="text-xs px-2 py-1"
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Backpack className="w-5 h-5" />
          Inventory
        </h3>
        <div className="text-sm text-muted-foreground">
          {character.inventory?.length || 0} items
        </div>
      </div>

      {/* Equipment Slots - only show on equipment tab or all tab */}
      {(activeTab === 'equipment' || activeTab === 'all') && equipmentItems.length > 0 && renderEquipmentSlots()}

      {/* Tab Navigation */}
      <div className="overflow-x-auto border-b">
        <div className="flex min-w-max">
          {[
            { id: 'all' as const, label: 'All', count: character.inventory?.length || 0, icon: Package },
            { id: 'equipment' as const, label: 'Equipment', count: equipmentItems.length, icon: Shield },
            { id: 'consumables' as const, label: 'Consumables', count: consumableItems.length, icon: Zap },
            { id: 'materials' as const, label: 'Materials', count: materialItems.length, icon: Gem },
          ].map(tab => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Inventory Items */}
      <div className="space-y-2">
        {getActiveItems().length > 0 ? (
          getActiveItems().map(renderInventoryItem)
        ) : (
          <div className="bg-muted/50 p-8 rounded-lg text-center text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2" />
            {activeTab === 'all' ? (
              <>Your bag is empty.<br />Start mining or visit the market!</>
            ) : (
              <>No {activeTab} items found.<br />Try a different tab or go mining!</>
            )}
          </div>
        )}
      </div>

      <Button onClick={onBack} variant="ghost">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
    </div>
  )
}
