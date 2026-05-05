// src/utils/enhanced-toast.ts - Enhanced toast system with auto-merging and progressive updates
import { toast } from '@/components/ui/use-toast'

interface ToastState {
  id: string
  type: 'travel' | 'mining' | 'purchase' | 'combat' | 'general'
  count: number
  data: any
  timestamp: number
}

class EnhancedToastManager {
  private activeToasts = new Map<string, ToastState>()
  private mergingTimeout = 2000 // 2 seconds to collect similar toasts
  private timers = new Map<string, NodeJS.Timeout>()

  /**
   * Progressive toast for multi-step processes like travel
   */
  progressive(id: string, steps: { message: string; description?: string }[], currentStep: number = 0) {
    const step = steps[currentStep]
    if (!step) return

    const toastId = `progressive_${id}`
    
    toast.info(step.message, {
      description: step.description,
      toastId,
      duration: currentStep === steps.length - 1 ? 4000 : Infinity, // Only auto-dismiss on final step
      closeButton: currentStep === steps.length - 1
    })

    return {
      next: () => this.progressive(id, steps, currentStep + 1),
      complete: (finalMessage?: string, finalDescription?: string) => {
        toast.success(finalMessage || step.message, {
          description: finalDescription || step.description,
          toastId,
          duration: 4000,
          closeButton: true
        })
      },
      error: (errorMessage: string, errorDescription?: string) => {
        toast.error(errorMessage, {
          description: errorDescription,
          toastId,
          duration: 5000,
          closeButton: true
        })
      }
    }
  }

  /**
   * Progressive mining toast for complete mining flow
   */
  miningFlow(energyCost: number) {
    const id = `mining_${Date.now()}`
    
    const steps = [
      { 
        message: '⛏️ MINING_IN_PROGRESS', 
        description: `CONSUMING: ${energyCost} ENERGY` 
      },
      { 
        message: '⛏️ PROCESSING_RESULTS', 
        description: 'ANALYZING_EXTRACTED_MATERIALS...' 
      }
    ]

    try {
      const progressToast = this.progressive(id, steps)
      
      // Auto-advance to processing step
      setTimeout(() => {
        try {
          progressToast.next()
        } catch (error) {
          console.warn('Error advancing mining toast:', error)
        }
      }, 800)

      return {
        success: (item: string, autoEquipped: boolean = false) => {
          try {
            const description = autoEquipped 
              ? `FOUND: ${item.toUpperCase()}\nAUTO_EQUIPPED | ADDED_TO_INVENTORY`
              : `FOUND: ${item.toUpperCase()}\nADDED_TO_INVENTORY`
            
            progressToast.complete('⛏️ MINING_SUCCESSFUL', description)
          } catch (error) {
            console.warn('Error completing mining toast:', error)
          }
        },
        empty: () => {
          try {
            progressToast.complete('⛏️ MINING_COMPLETE', `NO_RESOURCES_FOUND\nENERGY_CONSUMED: ${energyCost}`)
          } catch (error) {
            console.warn('Error completing empty mining toast:', error)
          }
        },
        error: (error: string) => {
          try {
            progressToast.error('⛏️ MINING_FAILED', error)
          } catch (toastError) {
            console.warn('Error showing mining error toast:', toastError)
          }
        }
      }
    } catch (error) {
      console.error('Error creating mining flow toast:', error)
      // Return fallback methods that use regular toasts
      return {
        success: (item: string, autoEquipped: boolean = false) => {
          const equipment = autoEquipped ? ' (AUTO-EQUIPPED)' : ''
          toast.success(`⛏️ Found ${item}!${equipment}`)
        },
        empty: () => {
          toast.warning(`⛏️ Nothing found (-${energyCost} energy)`)
        },
        error: (error: string) => {
          toast.error(`⛏️ Mining failed: ${error}`)
        }
      }
    }
  }

  /**
   * Auto-merging toast for rapid similar notifications
   */
  autoMerge(type: 'mining' | 'purchase' | 'combat', data: {
    action: string
    item?: string
    quantity?: number
    location?: string
    [key: string]: any
  }) {
    const key = `${type}_${data.action}_${data.item || 'general'}`
    const existing = this.activeToasts.get(key)

    if (existing) {
      // Update existing toast
      existing.count += 1
      existing.data.quantity = (existing.data.quantity || 1) + (data.quantity || 1)
      existing.timestamp = Date.now()

      this.updateMergedToast(key, existing)
    } else {
      // Create new toast
      const toastState: ToastState = {
        id: key,
        type,
        count: 1,
        data: { ...data, quantity: data.quantity || 1 },
        timestamp: Date.now()
      }

      this.activeToasts.set(key, toastState)
      this.showMergedToast(key, toastState)
    }

    // Clear existing timer and set new one
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!)
    }

    const timer = setTimeout(() => {
      this.finalizeToast(key)
    }, this.mergingTimeout)

    this.timers.set(key, timer)
  }

  private showMergedToast(key: string, toastState: ToastState) {
    const { type, data } = toastState
    
    let message = ''
    let description = ''

    switch (type) {
      case 'mining':
        message = `⛏️ MINING_IN_PROGRESS`
        description = `FOUND: ${data.item?.toUpperCase() || 'RESOURCES'}`
        break
      case 'purchase':
        message = `🛒 PURCHASE_IN_PROGRESS`
        description = `ITEM: ${data.item?.toUpperCase() || 'ITEMS'}`
        break
      case 'combat':
        message = `⚔️ COMBAT_IN_PROGRESS`
        description = `ACTION: ${data.action?.toUpperCase() || 'FIGHTING'}`
        break
    }

    toast.info(message, {
      description,
      toastId: key,
      duration: Infinity,
      closeButton: false
    })
  }

  private updateMergedToast(key: string, toastState: ToastState) {
    const { type, data, count } = toastState
    
    let message = ''
    let description = ''

    switch (type) {
      case 'mining':
        message = `⛏️ MINING_IN_PROGRESS`
        description = `FOUND: ${data.item?.toUpperCase() || 'RESOURCES'} (x${data.quantity})`
        if (count > 1) description += ` • ${count} ATTEMPTS`
        break
      case 'purchase':
        message = `🛒 PURCHASE_IN_PROGRESS`
        description = `ITEM: ${data.item?.toUpperCase() || 'ITEMS'} (x${data.quantity})`
        if (count > 1) description += ` • ${count} TRANSACTIONS`
        break
      case 'combat':
        message = `⚔️ COMBAT_IN_PROGRESS`
        description = `ACTION: ${data.action?.toUpperCase() || 'FIGHTING'} (x${count})`
        break
    }

    toast.info(message, {
      description,
      toastId: key,
      duration: Infinity,
      closeButton: false
    })
  }

  private finalizeToast(key: string) {
    const toastState = this.activeToasts.get(key)
    if (!toastState) return

    const { type, data, count } = toastState
    
    let message = ''
    let description = ''

    switch (type) {
      case 'mining':
        message = `⛏️ MINING_COMPLETE`
        description = `TOTAL: ${data.item?.toUpperCase() || 'RESOURCES'} (x${data.quantity})`
        if (count > 1) description += ` • ${count} SUCCESSFUL_ATTEMPTS`
        break
      case 'purchase':
        message = `🛒 PURCHASE_COMPLETE`
        description = `ACQUIRED: ${data.item?.toUpperCase() || 'ITEMS'} (x${data.quantity})`
        if (count > 1) description += ` • ${count} TRANSACTIONS`
        break
      case 'combat':
        message = `⚔️ COMBAT_COMPLETE`
        description = `RESULT: ${data.action?.toUpperCase() || 'VICTORY'} (x${count})`
        break
    }

    toast.success(message, {
      description,
      toastId: key,
      duration: 4000,
      closeButton: true
    })

    // Cleanup
    this.activeToasts.delete(key)
    this.timers.delete(key)
  }

  /**
   * Progressive equipment toast for equip/unequip actions
   */
  equipmentFlow(action: 'equip' | 'unequip', itemName: string, category: string) {
    const id = `equipment_${Date.now()}`
    
    const steps = [
      { 
        message: action === 'equip' ? '⚙️ INSTALLING_EQUIPMENT' : '⚙️ REMOVING_EQUIPMENT', 
        description: `ITEM: ${itemName.toUpperCase()}\nCATEGORY: ${category.toUpperCase()}` 
      },
      { 
        message: action === 'equip' ? '⚙️ CALIBRATING_SYSTEMS' : '⚙️ UPDATING_CONFIGURATION', 
        description: 'ADJUSTING_CHARACTER_PARAMETERS...' 
      }
    ]

    try {
      const progressToast = this.progressive(id, steps)
      
      // Auto-advance to calibration step
      setTimeout(() => {
        try {
          progressToast.next()
        } catch (error) {
          console.warn('Error advancing equipment toast:', error)
        }
      }, 600)

      return {
        success: (rarity?: string, slotInfo?: string) => {
          try {
            const actionText = action === 'equip' ? 'EQUIPPED' : 'UNEQUIPPED'
            let description = `${actionText}: ${itemName.toUpperCase()}\nCATEGORY: ${category.toUpperCase()}`
            if (rarity) description += `\nRARITY: ${rarity.toUpperCase()}`
            if (slotInfo) description += `\n${slotInfo}`
            
            progressToast.complete(`⚙️ EQUIPMENT_${actionText}`, description)
          } catch (error) {
            console.warn('Error completing equipment toast:', error)
          }
        },
        error: (error: string) => {
          try {
            progressToast.error('⚙️ EQUIPMENT_ERROR', error)
          } catch (toastError) {
            console.warn('Error showing equipment error toast:', toastError)
          }
        }
      }
    } catch (error) {
      console.error('Error creating equipment flow toast:', error)
      // Return fallback methods that use regular toasts
      return {
        success: (rarity?: string, slotInfo?: string) => {
          const actionText = action === 'equip' ? 'equipped' : 'unequipped'
          toast.success(`⚙️ ${itemName} ${actionText}!`)
        },
        error: (error: string) => {
          toast.error(`⚙️ Equipment error: ${error}`)
        }
      }
    }
  }

  /**
   * Progressive consumable toast for using items
   */
  consumableFlow(itemName: string, effects: { energy?: number; health?: number; [key: string]: any }) {
    const id = `consumable_${Date.now()}`
    
    const steps = [
      { 
        message: '💊 CONSUMING_ITEM', 
        description: `ITEM: ${itemName.toUpperCase()}\nPREPARING_ABSORPTION...` 
      },
      { 
        message: '💊 PROCESSING_EFFECTS', 
        description: 'INTEGRATING_BIOLOGICAL_COMPOUNDS...' 
      }
    ]

    try {
      const progressToast = this.progressive(id, steps)
      
      // Auto-advance to processing step
      setTimeout(() => {
        try {
          progressToast.next()
        } catch (error) {
          console.warn('Error advancing consumable toast:', error)
        }
      }, 700)

      return {
        success: () => {
          try {
            const effectsList = [];
            if (effects.energy) effectsList.push(`ENERGY: +${effects.energy}`);
            if (effects.health) effectsList.push(`HEALTH: +${effects.health}`);
            
            const description = `CONSUMED: ${itemName.toUpperCase()}\n${effectsList.join('\n')}\nSTATUS: ABSORBED`
            
            progressToast.complete('💊 ITEM_CONSUMED', description)
          } catch (error) {
            console.warn('Error completing consumable toast:', error)
          }
        },
        error: (error: string) => {
          try {
            progressToast.error('💊 CONSUMPTION_FAILED', error)
          } catch (toastError) {
            console.warn('Error showing consumable error toast:', toastError)
          }
        }
      }
    } catch (error) {
      console.error('Error creating consumable flow toast:', error)
      // Return fallback methods that use regular toasts
      return {
        success: () => {
          const effectsList = [];
          if (effects.energy) effectsList.push(`+${effects.energy} energy`);
          if (effects.health) effectsList.push(`+${effects.health} health`);
          toast.success(`💊 Used ${itemName}! ${effectsList.join(', ')}`)
        },
        error: (error: string) => {
          toast.error(`💊 Item error: ${error}`)
        }
      }
    }
  }

  /**
   * Progressive purchase toast for buying items
   */
  purchaseFlow(itemName: string, cost: number) {
    const id = `purchase_${Date.now()}`
    
    const steps = [
      { 
        message: '🛒 PROCESSING_TRANSACTION', 
        description: `ITEM: ${itemName.toUpperCase()}\nCOST: ${cost} EARTH` 
      },
      { 
        message: '🛒 VALIDATING_PAYMENT', 
        description: 'TRANSFERRING_CURRENCY...' 
      }
    ]

    try {
      const progressToast = this.progressive(id, steps)
      
      // Auto-advance to validation step
      setTimeout(() => {
        try {
          progressToast.next()
        } catch (error) {
          console.warn('Error advancing purchase toast:', error)
        }
      }, 500)

      return {
        success: (newBalance: number, autoEquipped: boolean = false, actualItemName?: string) => {
          try {
            const displayName = actualItemName || itemName;
            let description = `PURCHASED: ${displayName.toUpperCase()}\nCOST: ${cost} EARTH\nBALANCE: ${newBalance} EARTH`
            if (autoEquipped) {
              description += '\nAUTO_EQUIPPED | ADDED_TO_INVENTORY'
            } else {
              description += '\nADDED_TO_INVENTORY'
            }
            
            progressToast.complete('🛒 PURCHASE_SUCCESSFUL', description)
          } catch (error) {
            console.warn('Error completing purchase toast:', error)
          }
        },
        error: (error: string) => {
          try {
            progressToast.error('🛒 PURCHASE_FAILED', error)
          } catch (toastError) {
            console.warn('Error showing purchase error toast:', toastError)
          }
        }
      }
    } catch (error) {
      console.error('Error creating purchase flow toast:', error)
      // Return fallback methods that use regular toasts
      return {
        success: (newBalance: number, autoEquipped: boolean = false, actualItemName?: string) => {
          const displayName = actualItemName || itemName;
          const equipped = autoEquipped ? ' (AUTO-EQUIPPED)' : ''
          toast.success(`🛒 Purchased ${displayName}!${equipped} Balance: ${newBalance} EARTH`)
        },
        error: (error: string) => {
          toast.error(`🛒 Purchase failed: ${error}`)
        }
      }
    }
  }

  /**
   * Simple travel toast (can be progressive or instant)
   */
  travel(fromLocation: string, toLocation: string, services: string[] = []) {
    const id = `travel_${Date.now()}`
    
    const steps = [
      { 
        message: '🗺️ TRAVEL_INITIATED', 
        description: `DEPARTING: ${fromLocation.toUpperCase()}` 
      },
      { 
        message: '🗺️ TRAVELING', 
        description: `DESTINATION: ${toLocation.toUpperCase()}` 
      }
    ]

    const progressToast = this.progressive(id, steps)
    
    // Auto-advance to traveling step
    setTimeout(() => {
      progressToast.next()
    }, 500)

    return {
      complete: () => progressToast.complete(
        '🗺️ ARRIVAL_SUCCESSFUL',
        `LOCATION: ${toLocation.toUpperCase()}\n${services.length > 0 
          ? `AVAILABLE_SERVICES: ${services.join(', ')}` 
          : 'NO_SERVICES_AVAILABLE'}`
      ),
      error: (error: string) => progressToast.error('🗺️ TRAVEL_FAILED', error)
    }
  }
}

// Export singleton instance
export const enhancedToast = new EnhancedToastManager()

// Convenience methods
export const gameToast = {
  travel: enhancedToast.travel.bind(enhancedToast),
  miningFlow: enhancedToast.miningFlow.bind(enhancedToast),
  equipmentFlow: enhancedToast.equipmentFlow.bind(enhancedToast),
  consumableFlow: enhancedToast.consumableFlow.bind(enhancedToast),
  purchaseFlow: enhancedToast.purchaseFlow.bind(enhancedToast),
  mining: (item: string, quantity: number = 1) => 
    enhancedToast.autoMerge('mining', { action: 'found', item, quantity }),
  miningEmpty: (energyCost: number) => 
    enhancedToast.autoMerge('mining', { action: 'empty', item: 'NOTHING', quantity: energyCost }),
  purchase: (item: string, quantity: number = 1) => 
    enhancedToast.autoMerge('purchase', { action: 'bought', item, quantity }),
  combat: (action: string) => 
    enhancedToast.autoMerge('combat', { action }),
  progressive: enhancedToast.progressive.bind(enhancedToast)
}