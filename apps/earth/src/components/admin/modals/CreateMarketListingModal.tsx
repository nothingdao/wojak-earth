/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/admin/modals/CreateMarketListingModal.tsx
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Item, Character, Location } from '@/types'

interface CreateMarketListingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (listingData: any) => Promise<void>
  isProcessing: boolean
  items?: Item[]
  characters?: Character[]
  locations?: Location[]
}

export const CreateMarketListingModal: React.FC<CreateMarketListingModalProps> = ({
  open,
  onOpenChange,
  onCreate,
  isProcessing,
  items = [],
  characters = [],
  locations = []
}) => {
  const [formData, setFormData] = useState({
    item_id: '',
    seller_id: null,
    location_id: '',
    price: 1,
    quantity: 1,
    is_system_item: true
  })

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        item_id: '',
        seller_id: null,
        location_id: '',
        price: 1,
        quantity: 1,
        is_system_item: true
      })
    }
  }, [open])

  const handleCreate = async () => {
    if (!formData.item_id || !formData.location_id) {
      return // Basic validation
    }
    await onCreate(formData)
  }

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const selectedItem = items.find(item => item.id === formData.item_id)
  const selectedLocation = locations.find(loc => loc.id === formData.location_id)

  // Filter locations that have markets
  const marketLocations = locations.filter(loc => loc.has_market)

  const isFormValid = formData.item_id && formData.location_id && formData.price > 0 && formData.quantity > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono">CREATE_MARKET_LISTING</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            ADD_NEW_ITEM_TO_MARKET
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-mono">ITEM *</Label>
            <Select
              value={formData.item_id}
              onValueChange={(value) => handleInputChange('item_id', value)}
            >
              <SelectTrigger className="font-mono text-xs">
                <SelectValue placeholder="SELECT_ITEM" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id} className="font-mono text-xs">
                    {item.name.toUpperCase()} ({item.rarity.toUpperCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedItem && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedItem.description}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-mono">LOCATION *</Label>
            <Select
              value={formData.location_id}
              onValueChange={(value) => handleInputChange('location_id', value)}
            >
              <SelectTrigger className="font-mono text-xs">
                <SelectValue placeholder="SELECT_MARKET_LOCATION" />
              </SelectTrigger>
              <SelectContent>
                {marketLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id} className="font-mono text-xs">
                    {location.name.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {marketLocations.length === 0 && (
              <div className="text-xs text-destructive mt-1">
                NO_MARKET_LOCATIONS_AVAILABLE
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-mono">PRICE *</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseInt(e.target.value) || 1)}
                className="font-mono text-xs"
                min="1"
                placeholder="EARTH"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">QUANTITY *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                className="font-mono text-xs"
                min="1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-mono">ITEM_TYPE</Label>
            <Select
              value={formData.is_system_item ? 'system' : 'player'}
              onValueChange={(value) => handleInputChange('is_system_item', value === 'system')}
            >
              <SelectTrigger className="font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="player" className="font-mono text-xs">PLAYER_ITEM</SelectItem>
                <SelectItem value="system" className="font-mono text-xs">SYSTEM_ITEM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedItem && isFormValid && (
            <div className="bg-muted/30 border border-primary/20 rounded p-2">
              <div className="text-xs font-mono text-muted-foreground">PREVIEW</div>
              <div className="text-xs font-mono">
                <div className="text-primary font-bold">{selectedItem.name.toUpperCase()}</div>
                <div>SELLER: <span className="text-green-500">SYSTEM</span></div>
                <div>LOCATION: {selectedLocation?.name.toUpperCase()}</div>
                <div>TYPE: {formData.is_system_item ? 'SYSTEM' : 'PLAYER'}</div>
                <div>PRICE: <span className="text-yellow-500">{formData.price}</span> EARTH EACH</div>
                <div>QTY: {formData.quantity}</div>
                <div className="border-t border-primary/20 mt-1 pt-1">
                  TOTAL VALUE: <span className="text-yellow-500 font-bold">{formData.price * formData.quantity}</span> EARTH
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 font-mono text-xs"
              onClick={handleCreate}
              disabled={isProcessing || !isFormValid}
            >
              {isProcessing ? 'CREATING...' : 'CREATE_LISTING'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 font-mono text-xs"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              CANCEL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
