import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Loader2,
  Zap,
  Heart,
  AlertTriangle,
  Star,
  Crown,
  Database,
  Package,
  ChevronUp,
  ChevronDown,
  X,
  Save,
  Camera
} from 'lucide-react'
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
  GiSunglasses,
  GiCloak,
  GiCyborgFace,
  GiHairStrands
} from 'react-icons/gi'
import type { Character } from '@/types'
import EquipmentVisualizer from '@/components/EquipmentVisualizer'
import { useWalletInfo } from '@/hooks/useWalletInfo'
import { toast } from '@/components/ui/use-toast'
import { SERVER_URL } from '@/config/functionsBase'

interface InventoryViewProps {
  character: Character
  loadingItems: Set<string>
  onUseItem: (inventoryId: string, itemName: string, energy_effect?: number, health_effect?: number, event?: React.MouseEvent) => void
  onEquipItem: (inventoryId: string, is_equipped: boolean, targetSlot?: string, event?: React.MouseEvent) => void
  onSetPrimary?: (inventoryId: string, category: string) => void
  onReplaceSlot?: (inventoryId: string, category: string, slotIndex: number) => void
  onCharacterUpdated?: () => Promise<void>
}

const EQUIPMENT_SLOTS = {
  hair: { name: 'HAIR', icon: GiHairStrands, layer_type: 'HAIR' },
  headwear: { name: 'HEADGEAR', icon: GiCrown, layer_type: 'HAT' },
  face_covering: { name: 'FACE_COVER', icon: GiCyborgFace, layer_type: 'FACE_COVERING' },
  face_accessory: { name: 'FACE_GEAR', icon: GiSunglasses, layer_type: 'FACE_ACCESSORY' },
  clothing: { name: 'CLOTHING', icon: GiShirt, layer_type: 'CLOTHING' },
  outerwear: { name: 'OUTERWEAR', icon: GiCloak, layer_type: 'OUTERWEAR' },
  misc_accessory: { name: 'ACCESSORY', icon: GiGemNecklace, layer_type: 'ACCESSORY' },
  tool: { name: 'TOOL', icon: GiSpade, category: 'TOOL' },
} as const

const getMaxSlotsForCategory = (characterLevel: number) => {
  return Math.min(1 + Math.floor(characterLevel / 5), 4)
}

const getLevelForSlot = (slotIndex: number) => {
  return (slotIndex - 1) * 5
}

const getSlotForItem = (item: Character['inventory'][0]['item']) => {
  if (item.category === 'TOOL') return 'tool'

  switch (item.layer_type) {
    case 'HAIR': return 'hair'
    case 'HAT': return 'headwear'
    case 'FACE_COVERING': return 'face_covering'
    case 'FACE_ACCESSORY': return 'face_accessory'
    case 'CLOTHING': return 'clothing'
    case 'OUTERWEAR': return 'outerwear'
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
  onReplaceSlot,
  onCharacterUpdated
}: InventoryViewProps) {
  const [showInventoryPanel, setShowInventoryPanel] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [showSlotMenu, setShowSlotMenu] = useState<string | null>(null)
  const [showConsumableMenu, setShowConsumableMenu] = useState(false)
  const [equipCandidate, setEquipCandidate] = useState<{
    newItem: Character['inventory'][0]
    conflictingItem: Character['inventory'][0]
    targetSlot: string
    slotIndex: number
  } | null>(null)
  const [isSavingAppearance, setIsSavingAppearance] = useState(false)
  const exportImageRef = useRef<(() => Promise<Blob | null>) | null>(null)
  const walletInfo = useWalletInfo()

  // Get equipped items by category and slot
  const getEquippedByCategory = (category: string) => {
    return character.inventory?.filter(inv =>
      inv.is_equipped && inv.equipped_slot === category
    ).sort((a, b) => (a.slot_index || 1) - (b.slot_index || 1)) || []
  }

  const getEquippedBySlot = (category: string, slotIndex: number = 1) => {
    return character.inventory?.find(inv =>
      inv.is_equipped && inv.equipped_slot === category && (inv.slot_index || 1) === slotIndex
    )
  }

  // Enhanced equip handler with multi-slot support
  const handleEquipWithConflictCheck = (item: Character['inventory'][0], event?: React.MouseEvent) => {
    if (item.is_equipped) {
      onEquipItem(item.id, false, undefined, event)
      return
    }

    const targetSlot = getSlotForItem(item.item)
    if (!targetSlot) return

    const maxSlots = getMaxSlotsForCategory(character.level)
    const equippedInCategory = getEquippedByCategory(targetSlot)

    let availableSlot = null
    for (let i = 1; i <= maxSlots; i++) {
      if (!getEquippedBySlot(targetSlot, i)) {
        availableSlot = i
        break
      }
    }

    if (availableSlot) {
      onEquipItem(item.id, true, targetSlot, event)
    } else {
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

  const confirmReplacement = () => {
    if (equipCandidate && onReplaceSlot) {
      onReplaceSlot(equipCandidate.newItem.id, equipCandidate.targetSlot, equipCandidate.slotIndex)
    }
    setShowReplaceDialog(false)
    setEquipCandidate(null)
  }

  const handleSetPrimary = (item: Character['inventory'][0]) => {
    if (onSetPrimary && item.equipped_slot) {
      onSetPrimary(item.id, item.equipped_slot)
    }
  }

  // Save character appearance
  const saveCharacterAppearance = useCallback(async () => {
    if (!exportImageRef.current || !walletInfo.publicKey) {
      toast({
        title: "Save Failed",
        description: "Unable to export character image or wallet not connected",
        variant: "destructive"
      })
      return
    }

    setIsSavingAppearance(true)

    try {
      // Export character image as blob
      const imageBlob = await exportImageRef.current()
      if (!imageBlob) {
        throw new Error("Failed to export character image")
      }

      // Convert blob to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error("Failed to convert image to base64"))
          }
        }
        reader.onerror = () => reject(new Error("File reader error"))
      })
      
      reader.readAsDataURL(imageBlob)
      const base64Image = await base64Promise

      // Call API to update character appearance
      const response = await fetch(`${SERVER_URL}/earth/update-appearance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character_id: character.id,
          image_blob: base64Image,
          wallet_address: walletInfo.publicKey.toString(),
          description: 'Equipment appearance update'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update character appearance')
      }

      toast({
        title: "Appearance Saved",
        description: `Character appearance updated to version ${result.version}`,
        variant: "default"
      })

      // Refetch character data to update all components with new image
      if (onCharacterUpdated) {
        await onCharacterUpdated()
      }

    } catch (error) {
      console.error('Save appearance error:', error)
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSavingAppearance(false)
    }
  }, [character.id, walletInfo.publicKey])

  // Handle receiving the export function from EquipmentVisualizer
  const handleImageExport = useCallback((exportFunction: () => Promise<Blob | null>) => {
    exportImageRef.current = exportFunction
  }, [])

  // Get compatible items for a specific slot
  const getCompatibleItems = (slotKey: string) => {
    const slot = EQUIPMENT_SLOTS[slotKey as keyof typeof EQUIPMENT_SLOTS]
    return character.inventory?.filter(inv => {
      const targetSlot = getSlotForItem(inv.item)
      return targetSlot === slotKey && !inv.is_equipped
    }) || []
  }

  // Get consumable items
  const getConsumableItems = () => {
    return character.inventory?.filter(inv => inv.item.category === 'CONSUMABLE') || []
  }

  // Get all equipped items for a slot
  const getAllEquippedForSlot = (slotKey: string) => {
    return getEquippedByCategory(slotKey)
  }

  // Quick Equipment Slot Component
  const QuickEquipmentSlot = ({ slotKey }: { slotKey: string }) => {
    const slot = EQUIPMENT_SLOTS[slotKey as keyof typeof EQUIPMENT_SLOTS]
    const equipped = getEquippedBySlot(slotKey, 1)
    const IconComponent = slot.icon

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              setShowSlotMenu(showSlotMenu === slotKey ? null : slotKey)
              setShowConsumableMenu(false)
            }}
            className={`
              w-10 h-10 border-2 rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-all relative
              ${equipped
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-primary/50'
              }
              ${showSlotMenu === slotKey ? 'ring-2 ring-primary/50' : ''}
            `}
          >
            <IconComponent className="w-3 h-3" />
            {equipped?.is_primary && <Crown className="w-2 h-2 text-yellow-500 absolute -top-1 -right-1" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{`${equipped ? 'Change' : 'Equip'} ${slot.name}`}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Quick Consumable Component
  const QuickConsumable = ({ item }: { item: Character['inventory'][0] }) => {
    const energy_effect = item.item.energy_effect || 0
    const health_effect = item.item.health_effect || 0
    const wouldWasteEnergy = energy_effect > 0 && character.energy >= 100
    const wouldWasteHealth = health_effect > 0 && character.health >= 100
    const wouldBeWasted = (energy_effect > 0 && wouldWasteEnergy) || (health_effect > 0 && wouldWasteHealth)
    const isLoading = loadingItems.has(item.id)

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              if (!wouldBeWasted && !isLoading) {
                onUseItem(item.id, item.item.name, item.item.energy_effect, item.item.health_effect, e)
              }
            }}
            disabled={wouldBeWasted || isLoading}
            className={`
              w-10 h-10 border-2 rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-all relative
              ${wouldBeWasted
                ? 'border-muted bg-muted/10 text-muted-foreground/50'
                : 'border-success/50 bg-success/10 text-success hover:border-success'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                {energy_effect > 0 && <Zap className="w-3 h-3" />}
                {health_effect > 0 && <Heart className="w-3 h-3" />}
                {item.quantity > 1 && (
                  <span className="absolute -top-1 -right-1 bg-background border border-success/50 rounded-full w-4 h-4 flex items-center justify-center text-xs">
                    {item.quantity}
                  </span>
                )}
              </>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{wouldBeWasted 
            ? `Already at full ${wouldWasteEnergy ? 'energy' : 'health'}`
            : `Use ${item.item.name}`
          }</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Mobile Slot Menu (appears as bottom sheet on mobile)
  const SlotMenu = ({ slotKey }: { slotKey: string }) => {
    const slot = EQUIPMENT_SLOTS[slotKey as keyof typeof EQUIPMENT_SLOTS]
    const compatibleItems = getCompatibleItems(slotKey)
    const equippedItems = getAllEquippedForSlot(slotKey)
    const maxSlots = getMaxSlotsForCategory(character.level)

    return (
      <>
        {/* Mobile: Bottom Sheet */}
        <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-primary/30 z-50 md:hidden">
          <div className="max-h-[50vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-primary/20 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <slot.icon className="w-4 h-4 text-primary" />
                  <span className="text-primary font-bold text-sm font-mono">{slot.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {equippedItems.length}/{maxSlots}
                  </Badge>
                </div>
                <Button
                  onClick={() => setShowSlotMenu(null)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {/* Equipped Items */}
                {equippedItems.map(item => (
                  <div key={item.id} className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-primary text-sm truncate">
                            {item.item.name.toUpperCase()}
                          </span>
                          {item.is_primary && <Crown className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          SLOT_{item.slot_index} • {item.item.rarity}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!item.is_primary && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSetPrimary(item)}
                            className="h-8 px-2 text-xs"
                          >
                            <Star className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => onEquipItem(item.id, false, undefined, e)}
                          className="h-8 px-2 text-xs"
                        >
                          REMOVE
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Available Items */}
                {compatibleItems.map(item => (
                  <div key={item.id} className="bg-muted/30 border border-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-primary text-sm truncate">
                          {item.item.name.toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.item.rarity} {item.quantity > 1 && `• x${item.quantity}`}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          handleEquipWithConflictCheck(item, e)
                          setShowSlotMenu(null)
                        }}
                        disabled={loadingItems.has(item.id)}
                        className="h-8 px-3 text-xs"
                      >
                        {loadingItems.has(item.id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'EQUIP'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Empty state */}
                {compatibleItems.length === 0 && equippedItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    NO_{slot.name}_FOUND
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Desktop: Popover */}
        <div className="absolute top-0 left-full ml-2 w-64 bg-background border-2 border-primary/30 rounded-lg shadow-lg z-50 font-mono hidden md:block">
          {/* Same content as mobile but in popover form */}
          <div className="p-3 border-b border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <slot.icon className="w-4 h-4 text-primary" />
                <span className="text-primary font-bold text-sm">{slot.name}</span>
              </div>
              <Button
                onClick={() => setShowSlotMenu(null)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <ScrollArea className="max-h-64">
            <div className="p-2 space-y-2">
              {/* Same content structure as mobile */}
              {equippedItems.map(item => (
                <div key={item.id} className="bg-primary/10 border border-primary/30 rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-primary truncate">{item.item.name.toUpperCase()}</div>
                      <div className="text-muted-foreground">SLOT_{item.slot_index}</div>
                    </div>
                    <div className="flex gap-1">
                      {!item.is_primary && (
                        <Button size="sm" variant="ghost" onClick={() => handleSetPrimary(item)} className="h-6 w-6 p-0">
                          <Star className="w-3 h-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={(e) => onEquipItem(item.id, false, undefined, e)} className="h-6 w-6 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {compatibleItems.map(item => (
                <div key={item.id} className="bg-muted/30 border border-muted/50 rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-primary truncate">{item.item.name.toUpperCase()}</div>
                      <div className="text-muted-foreground">{item.item.rarity}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        handleEquipWithConflictCheck(item, e)
                        setShowSlotMenu(null)
                      }}
                      className="h-6 px-2"
                    >
                      EQUIP
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </>
    )
  }

  // Consumable Menu (bottom sheet)
  const ConsumableMenu = () => {
    const consumables = getConsumableItems()

    return (
      <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-primary/30 z-50">
        <div className="max-h-[50vh] flex flex-col">
          <div className="p-4 border-b border-primary/20 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GiHealthPotion className="w-4 h-4 text-primary" />
                <span className="text-primary font-bold text-sm font-mono">CONSUMABLES</span>
                <Badge variant="outline" className="text-xs">
                  {consumables.length}
                </Badge>
              </div>
              <Button
                onClick={() => setShowConsumableMenu(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {consumables.map(item => {
                const energy_effect = item.item.energy_effect || 0
                const health_effect = item.item.health_effect || 0
                const wouldWasteEnergy = energy_effect > 0 && character.energy >= 100
                const wouldWasteHealth = health_effect > 0 && character.health >= 100
                const wouldBeWasted = (energy_effect > 0 && wouldWasteEnergy) || (health_effect > 0 && wouldWasteHealth)
                const isLoading = loadingItems.has(item.id)

                return (
                  <div key={item.id} className="bg-muted/30 border border-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-primary text-sm">
                          {item.item.name.toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {item.item.description}
                        </div>
                        <div className="flex gap-3 text-xs">
                          {energy_effect > 0 && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <Zap className="w-3 h-3" />+{energy_effect}
                            </span>
                          )}
                          {health_effect > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                              <Heart className="w-3 h-3" />+{health_effect}
                            </span>
                          )}
                          <span className="text-muted-foreground">x{item.quantity}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          onUseItem(item.id, item.item.name, item.item.energy_effect, item.item.health_effect, e)
                          if (item.quantity <= 1) setShowConsumableMenu(false)
                        }}
                        disabled={wouldBeWasted || isLoading}
                        className="h-8 px-3 text-xs"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : wouldBeWasted ? (
                          'FULL'
                        ) : (
                          'USE'
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}

              {consumables.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  NO_CONSUMABLES_FOUND
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    )
  }

  // Get items by category for main inventory
  const getItemsByCategory = (category: string) => {
    if (category === 'all') return character.inventory || []
    if (category === 'equipped') return character.inventory?.filter(i => i.is_equipped) || []
    if (category === 'equipment') return character.inventory?.filter(inv =>
      ['HAT', 'CLOTHING', 'ACCESSORY', 'TOOL'].includes(inv.item.category) ||
      ['HAIR', 'CLOTHING', 'OUTERWEAR', 'FACE_COVERING', 'FACE_ACCESSORY', 'HAT', 'ACCESSORY'].includes(inv.item.layer_type)
    ) || []
    if (category === 'consumables') return character.inventory?.filter(i => i.item.category === 'CONSUMABLE') || []
    if (category === 'materials') return character.inventory?.filter(i => i.item.category === 'MATERIAL') || []
    return []
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HAT': return <GiTopHat />
      case 'CLOTHING': return <GiShirt />
      case 'ACCESSORY': return <GiNecklace />
      case 'TOOL': return <GiMining />
      case 'MATERIAL': return <GiRock />
      case 'CONSUMABLE': return <GiHealthPotion />
      default: return <GiCube />
    }
  }

  return (
    <div className="min-h-screen bg-background font-mono">
      <div className="relative max-w-4xl mx-auto">

        {/* Fixed Character Display */}
        <div className="p-4 pb-20">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="text-primary font-bold text-sm">PLAYER_SYSTEM</span>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              LVL.{character.level}
            </Badge>
          </div>

          {/* Character Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Character Visualizer - Always Centered */}
            <div className="lg:col-span-2 flex justify-center">
              <EquipmentVisualizer
                character={character}
                size="medium"
                showControls={false}
                className="w-full max-w-xs"
                onImageExport={handleImageExport}
              />
            </div>

            {/* Controls Sidebar */}
            <div className="space-y-4">

              {/* Save Appearance */}
              <div className="bg-muted/20 border border-primary/20 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-2">APPEARANCE</div>
                <Button
                  onClick={saveCharacterAppearance}
                  disabled={isSavingAppearance || !walletInfo.publicKey}
                  variant="outline"
                  className="w-full h-8 text-xs font-mono"
                >
                  {isSavingAppearance ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      SAVING...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-2" />
                      SAVE_APPEARANCE
                    </>
                  )}
                </Button>
              </div>

              {/* Quick Equipment */}
              <div className="bg-muted/20 border border-primary/20 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-2">EQUIPMENT</div>
                <TooltipProvider>
                  <div className="grid grid-cols-4 gap-2 relative">
                    {Object.keys(EQUIPMENT_SLOTS).map((slotKey) => (
                      <div key={slotKey} className="relative">
                        <QuickEquipmentSlot slotKey={slotKey} />
                        {/* Desktop popover menu - only show on desktop */}
                        {showSlotMenu === slotKey && (
                          <div className="hidden md:block">
                            <SlotMenu slotKey={slotKey} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TooltipProvider>
              </div>

              {/* Quick Consumables */}
              <div className="bg-muted/20 border border-primary/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">CONSUMABLES</div>
                  <Button
                    onClick={() => {
                      setShowConsumableMenu(true)
                      setShowSlotMenu(null)
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                  >
                    ALL
                  </Button>
                </div>
                <TooltipProvider>
                  <div className="grid grid-cols-3 gap-2">
                    {getConsumableItems().slice(0, 3).map(item => (
                      <QuickConsumable key={item.id} item={item} />
                    ))}
                    {getConsumableItems().length === 0 && (
                      <div className="col-span-3 text-center py-2 text-muted-foreground text-xs">
                        NO_CONSUMABLES
                      </div>
                    )}
                    {/* Show placeholder slots if less than 3 items */}
                    {Array.from({ length: Math.max(0, 3 - getConsumableItems().length) }, (_, i) => (
                      <div key={`empty-${i}`} className="w-10 h-10 border-2 border-dashed border-muted-foreground/20 rounded-lg" />
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-primary/20 z-20">
          <div className="max-w-4xl mx-auto p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => {
                  setShowConsumableMenu(!showConsumableMenu)
                  setShowSlotMenu(null)
                }}
                variant="outline"
                className="h-12 font-mono"
              >
                <GiHealthPotion className="w-4 h-4 mr-2" />
                CONSUMABLES
                {getConsumableItems().length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getConsumableItems().length}
                  </Badge>
                )}
              </Button>

              <Button
                onClick={() => {
                  setShowInventoryPanel(!showInventoryPanel)
                  setShowSlotMenu(null)
                  setShowConsumableMenu(false)
                }}
                variant="outline"
                className="h-12 font-mono"
              >
                <GiBackpack className="w-4 h-4 mr-2" />
                FULL_INVENTORY
                {showInventoryPanel ? <ChevronDown className="w-4 h-4 ml-2" /> : <ChevronUp className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Slot Menu (mobile bottom sheet) */}
        {showSlotMenu && (
          <div className="md:hidden">
            <SlotMenu slotKey={showSlotMenu} />
          </div>
        )}

        {/* Consumable Menu */}
        {showConsumableMenu && (
          <ConsumableMenu />
        )}

        {/* Full Inventory Panel */}
        {showInventoryPanel && (
          <div className="fixed inset-x-0 bottom-0 bg-background border-t-2 border-primary/30 z-50">
            <div className="h-[80vh] flex flex-col max-w-4xl mx-auto">

              {/* Inventory Header */}
              <div className="p-4 border-b border-primary/20 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    <span className="text-primary font-bold text-sm">FULL_INVENTORY</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      {character.inventory?.length || 0}_ITEMS
                    </Badge>
                    <Button
                      onClick={() => setShowInventoryPanel(false)}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      CLOSE
                    </Button>
                  </div>
                </div>

                {/* Category Tabs */}
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                  <TabsList className="grid w-full grid-cols-4 h-8">
                    <TabsTrigger value="all" className="text-xs font-mono">
                      ALL
                      {character.inventory?.length > 0 && (
                        <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                          {character.inventory.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="equipment" className="text-xs font-mono">
                      GEAR
                      {getItemsByCategory('equipment').length > 0 && (
                        <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                          {getItemsByCategory('equipment').length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="consumables" className="text-xs font-mono">
                      ITEMS
                      {getItemsByCategory('consumables').length > 0 && (
                        <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                          {getItemsByCategory('consumables').length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="equipped" className="text-xs font-mono">
                      EQUIPPED
                      {getItemsByCategory('equipped').length > 0 && (
                        <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                          {getItemsByCategory('equipped').length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Inventory Content */}
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3 pb-20">
                    {getItemsByCategory(selectedCategory).map(item => {
                      const isConsumable = item.item.category === 'CONSUMABLE'
                      const energy_effect = item.item.energy_effect || 0
                      const health_effect = item.item.health_effect || 0
                      const wouldWasteEnergy = energy_effect > 0 && character.energy >= 100
                      const wouldWasteHealth = health_effect > 0 && character.health >= 100
                      const wouldBeWasted = isConsumable && ((energy_effect > 0 && wouldWasteEnergy) || (health_effect > 0 && wouldWasteHealth))
                      const isLoading = loadingItems.has(item.id)
                      const targetSlot = getSlotForItem(item.item)
                      const isEquippable = !!targetSlot

                      return (
                        <div key={item.id} className="bg-muted/30 border border-primary/20 rounded-lg p-3 font-mono">
                          <div className="flex items-center gap-3">
                            {/* Icon */}
                            <div className="w-10 h-10 bg-muted/50 border border-primary/20 rounded flex items-center justify-center text-primary flex-shrink-0">
                              {getCategoryIcon(item.item.category)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-bold text-primary text-sm">
                                  {item.item.name.toUpperCase()}
                                </span>
                                {item.is_equipped && (
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {item.is_primary && <Crown className="w-3 h-3 mr-1" />}
                                    SLOT_{item.slot_index}
                                  </Badge>
                                )}
                                {item.quantity > 1 && (
                                  <Badge variant="outline" className="text-xs">
                                    x{item.quantity}
                                  </Badge>
                                )}
                              </div>

                              <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {item.item.description}
                              </div>

                              <div className={`text-xs ${getRarityColor(item.item.rarity)} mb-1`}>
                                {item.item.rarity}
                                {targetSlot && ` • ${EQUIPMENT_SLOTS[targetSlot as keyof typeof EQUIPMENT_SLOTS]?.name}`}
                              </div>

                              {/* Effects for consumables */}
                              {isConsumable && (energy_effect > 0 || health_effect > 0) && (
                                <div className="text-xs text-success flex gap-3 font-mono">
                                  {energy_effect > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Zap className="w-3 h-3" />+{energy_effect}_ENERGY
                                    </span>
                                  )}
                                  {health_effect > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Heart className="w-3 h-3" />+{health_effect}_HEALTH
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col gap-1 min-w-[80px]">
                              {/* Equipment Button */}
                              {isEquippable && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={item.is_equipped ? "default" : "outline"}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleEquipWithConflictCheck(item, e)
                                  }}
                                  disabled={isLoading}
                                  className="text-xs px-2 py-1 h-6 w-full font-mono"
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    item.is_equipped ? 'UNEQUIP' : 'EQUIP'
                                  )}
                                </Button>
                              )}

                              {/* Set Primary Button */}
                              {item.is_equipped && !item.is_primary && onSetPrimary && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSetPrimary(item)}
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
                                    onUseItem(item.id, item.item.name, item.item.energy_effect, item.item.health_effect, e)
                                  }}
                                  disabled={wouldBeWasted || isLoading}
                                  title={wouldBeWasted ? `Already at full ${wouldWasteEnergy ? 'energy' : 'health'}` : `Use ${item.item.name}`}
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
                    })}

                    {getItemsByCategory(selectedCategory).length === 0 && (
                      <div className="text-center py-8">
                        <GiCube className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                        <div className="text-muted-foreground text-sm font-mono">NO_ITEMS_FOUND</div>
                        <div className="text-xs text-muted-foreground/70 mt-1">
                          {selectedCategory === 'equipment' && 'ACQUIRE_GEAR_FROM_TRADERS'}
                          {selectedCategory === 'consumables' && 'FIND_SUPPLIES_FOR_SURVIVAL'}
                          {selectedCategory === 'equipped' && 'EQUIP_ITEMS_TO_VIEW_HERE'}
                          {selectedCategory === 'all' && 'INVENTORY_EMPTY'}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}

        {/* Overlay for menus */}
        {(showInventoryPanel || showSlotMenu || showConsumableMenu) && (
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => {
              setShowInventoryPanel(false)
              setShowSlotMenu(null)
              setShowConsumableMenu(false)
            }}
          />
        )}
      </div>

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
    </div>
  )
}
