// src/components/admin/modals/EditItemModal.tsx
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { Item, ItemCategory } from '@/types'
import { ITEM_CATEGORIES, RARITIES, LAYER_TYPES } from '@/types'

// Get the LayerType and Rarity types from local admin types
type LayerType = 'BACKGROUND' | 'BASE' | 'CLOTHING' | 'HAT' | 'FACE_COVERING' | 'ACCESSORY' | 'OUTERWEAR' | 'FACE_ACCESSORY' | 'HAIR'
type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

interface EditItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Item | null
  onSave: (itemId: string, updates: Partial<Item>) => Promise<void>
  isProcessing: boolean
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  open,
  onOpenChange,
  item,
  onSave,
  isProcessing
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'MATERIAL' as ItemCategory,
    rarity: 'COMMON' as Rarity,
    image_url: '',
    durability: null as number | null,
    energy_effect: null as number | null,
    health_effect: null as number | null,
    layer_type: null as LayerType | null,
    layer_file: '',
    layer_gender: null as string | null,
    base_layer_file: '',
    has_gender_variants: false
  })

  // Update form data whenever item changes or modal opens
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category: item.category || 'MATERIAL',
        rarity: item.rarity || 'COMMON',
        image_url: item.image_url || '',
        durability: item.durability,
        energy_effect: item.energy_effect,
        health_effect: item.health_effect,
        layer_type: item.layer_type,
        layer_file: item.layer_file || '',
        layer_gender: item.layer_gender,
        base_layer_file: item.base_layer_file || '',
        has_gender_variants: item.has_gender_variants ?? false
      })
    }
  }, [item, open])

  const handleSave = async () => {
    if (!item) return
    await onSave(item.id, formData)
  }

  const handleInputChange = (field: keyof typeof formData, value: string | number | boolean | null | ItemCategory | Rarity | LayerType) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const categories = [...ITEM_CATEGORIES] as ItemCategory[]
  const rarities = [...RARITIES] as Rarity[]
  const layerTypes = [...LAYER_TYPES] as LayerType[]

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg font-mono max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">EDIT_ITEM</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            MODIFY_ITEM_PROPERTIES_AND_STATS
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-mono">ITEM_NAME *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="font-mono text-xs"
              placeholder="ENTER_ITEM_NAME"
            />
          </div>

          <div>
            <Label className="text-xs font-mono">DESCRIPTION *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="font-mono text-xs"
              placeholder="ITEM_DESCRIPTION"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-mono">CATEGORY</Label>
              <Select
                value={formData.category}
                onValueChange={(value: ItemCategory) => handleInputChange('category', value)}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="font-mono text-xs">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-mono">RARITY</Label>
              <Select
                value={formData.rarity}
                onValueChange={(value: Rarity) => handleInputChange('rarity', value)}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rarities.map((rarity) => (
                    <SelectItem key={rarity} value={rarity} className="font-mono text-xs">
                      {rarity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-mono">IMAGE_URL</Label>
            <Input
              value={formData.image_url}
              onChange={(e) => handleInputChange('image_url', e.target.value)}
              className="font-mono text-xs"
              placeholder="HTTP://EXAMPLE.COM/IMAGE.PNG"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-mono">DURABILITY</Label>
              <Input
                type="number"
                value={formData.durability || ''}
                onChange={(e) => handleInputChange('durability', e.target.value ? parseInt(e.target.value) : null)}
                className="font-mono text-xs"
                placeholder="ITEM_DURABILITY"
                min="0"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">LAYER_TYPE</Label>
              <Select
                value={formData.layer_type || 'NONE'}
                onValueChange={(value: LayerType) => handleInputChange('layer_type', value === 'NONE' ? null : value)}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="SELECT_LAYER_TYPE" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" className="font-mono text-xs">NONE</SelectItem>
                  {layerTypes.map((type) => (
                    <SelectItem key={type} value={type} className="font-mono text-xs">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono">EFFECTS</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-mono">ENERGY_EFFECT</Label>
                <Input
                  type="number"
                  value={formData.energy_effect || ''}
                  onChange={(e) => handleInputChange('energy_effect', e.target.value ? parseInt(e.target.value) : null)}
                  className="font-mono text-xs"
                  placeholder="±ENERGY"
                />
              </div>
              <div>
                <Label className="text-xs font-mono">HEALTH_EFFECT</Label>
                <Input
                  type="number"
                  value={formData.health_effect || ''}
                  onChange={(e) => handleInputChange('health_effect', e.target.value ? parseInt(e.target.value) : null)}
                  className="font-mono text-xs"
                  placeholder="±HEALTH"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono">LAYER_FILES</Label>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label className="text-xs font-mono">LAYER_FILE</Label>
                <Input
                  value={formData.layer_file}
                  onChange={(e) => handleInputChange('layer_file', e.target.value)}
                  className="font-mono text-xs"
                  placeholder="PATH/TO/LAYER/FILE"
                />
              </div>
              <div>
                <Label className="text-xs font-mono">BASE_LAYER_FILE</Label>
                <Input
                  value={formData.base_layer_file}
                  onChange={(e) => handleInputChange('base_layer_file', e.target.value)}
                  className="font-mono text-xs"
                  placeholder="PATH/TO/BASE/LAYER"
                />
              </div>
              <div>
                <Label className="text-xs font-mono">LAYER_GENDER</Label>
                <Select
                  value={formData.layer_gender || 'NONE'}
                  onValueChange={(value) => handleInputChange('layer_gender', value === 'NONE' ? null : value)}
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue placeholder="SELECT_GENDER" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" className="font-mono text-xs">NONE</SelectItem>
                    <SelectItem value="MALE" className="font-mono text-xs">MALE</SelectItem>
                    <SelectItem value="FEMALE" className="font-mono text-xs">FEMALE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="has_gender_variants"
              checked={formData.has_gender_variants}
              onCheckedChange={(checked) => handleInputChange('has_gender_variants', checked)}
            />
            <Label htmlFor="has_gender_variants" className="text-xs font-mono">HAS_GENDER_VARIANTS</Label>
          </div>

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
