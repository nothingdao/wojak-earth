// src/components/admin/modals/EditMarketListingModal.tsx
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import type { MarketListing, Item, Character, Location } from '@/types'

interface EditMarketListingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listing: MarketListing | null
  onSave: (listingId: string, updates: Partial<MarketListing>) => Promise<void>
  isProcessing: boolean
  items?: Item[]
  characters?: Character[]
  locations?: Location[]
}

export const EditMarketListingModal: React.FC<EditMarketListingModalProps> = ({
  open,
  onOpenChange,
  listing,
  onSave,
  isProcessing,
  items = [],
  characters = [],
  locations = []
}) => {
  const [formData, setFormData] = useState({
    item_id: '',
    seller_id: '',
    location_id: '',
    location_ids: [] as string[],
    price: 1,
    quantity: 1,
    is_system_item: false
  })

  // Update form data whenever listing changes or modal opens
  useEffect(() => {
    if (listing) {
      setFormData({
        item_id: listing.item_id || '',
        seller_id: listing.seller_id || '',
        location_id: listing.location_id || '',
        location_ids: listing.location_id ? [listing.location_id] : [],
        price: listing.price || 1,
        quantity: listing.quantity || 1,
        is_system_item: listing.is_system_item ?? false
      })
    }
  }, [listing, open])

  const handleSave = async () => {
    if (!listing) return
    await onSave(listing.id, formData)
  }

  const handleInputChange = (field: keyof typeof formData, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLocationToggle = (locationId: string) => {
    setFormData(prev => {
      const newLocationIds = prev.location_ids.includes(locationId)
        ? prev.location_ids.filter(id => id !== locationId)
        : [...prev.location_ids, locationId]
      
      return {
        ...prev,
        location_ids: newLocationIds,
        location_id: newLocationIds[0] || '' // Keep single location for backward compatibility
      }
    })
  }

  if (!listing) return null

  const selectedItem = items.find(item => item.id === formData.item_id)
  const selectedSeller = characters.find(char => char.id === formData.seller_id)
  const selectedLocation = locations.find(loc => loc.id === formData.location_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono">EDIT_MARKET_LISTING</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            MODIFY_MARKET_LISTING_DETAILS
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
            <Label className="text-xs font-mono">SELLER</Label>
            <Select
              value={formData.seller_id}
              onValueChange={(value) => handleInputChange('seller_id', value)}
            >
              <SelectTrigger className="font-mono text-xs">
                <SelectValue placeholder="SELECT_SELLER" />
              </SelectTrigger>
              <SelectContent>
                {characters.map((character) => (
                  <SelectItem key={character.id} value={character.id} className="font-mono text-xs">
                    {character.name.toUpperCase()} (LVL {character.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSeller && (
              <div className="text-xs text-muted-foreground mt-1">
                Level {selectedSeller.level} • {selectedSeller.earth} earths
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-mono">LOCATIONS *</Label>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                SELECT_MULTIPLE_LOCATIONS_FOR_LISTING
              </div>
              <div className="max-h-32 overflow-y-auto border border-primary/20 rounded p-2 bg-muted/10">
                {locations.filter(loc => loc.has_market).map((location) => (
                  <div key={location.id} className="flex items-center space-x-2 p-1">
                    <Checkbox
                      id={`location-${location.id}`}
                      checked={formData.location_ids.includes(location.id)}
                      onCheckedChange={() => handleLocationToggle(location.id)}
                      className="text-xs"
                    />
                    <label
                      htmlFor={`location-${location.id}`}
                      className="text-xs font-mono cursor-pointer flex-1"
                    >
                      {location.name.toUpperCase()}
                    </label>
                  </div>
                ))}
              </div>
              {formData.location_ids.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.location_ids.map(locationId => {
                    const location = locations.find(l => l.id === locationId)
                    return location ? (
                      <Badge key={locationId} variant="secondary" className="text-xs font-mono">
                        {location.name.toUpperCase()}
                        <button
                          onClick={() => handleLocationToggle(locationId)}
                          className="ml-1 hover:bg-destructive/20 rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null
                  })}
                </div>
              )}
            </div>
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

          {selectedItem && (
            <div className="bg-muted/30 border border-primary/20 rounded p-2">
              <div className="text-xs font-mono text-muted-foreground">PREVIEW</div>
              <div className="text-xs font-mono">
                <div className="text-primary font-bold">{selectedItem.name.toUpperCase()}</div>
                {selectedSeller && (
                  <div>SELLER: {selectedSeller.name.toUpperCase()}</div>
                )}
                {formData.location_ids.length > 0 && (
                  <div>LOCATIONS: {formData.location_ids.map(id => {
                    const loc = locations.find(l => l.id === id)
                    return loc?.name.toUpperCase()
                  }).filter(Boolean).join(', ')}</div>
                )}
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
              onClick={handleSave}
              disabled={isProcessing}
            >
              {isProcessing ? 'SAVING...' : 'SAVE_CHANGES'}
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
