// src/components/admin/modals/CreateItemModal.tsx
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreateItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (itemData: any) => Promise<void>
  isProcessing: boolean
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({
  open,
  onOpenChange,
  onCreate,
  isProcessing
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'MATERIAL',
    rarity: 'COMMON',
    energy_effect: 0,
    health_effect: 0,
    durability: 100
  })

  const handleCreate = async () => {
    await onCreate(formData)
    setFormData({
      name: '',
      description: '',
      category: 'MATERIAL',
      rarity: 'COMMON',
      energy_effect: 0,
      health_effect: 0,
      durability: 100
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono">CREATE_ITEM</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            ADD_NEW_ITEM_TO_GAME_WORLD
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-mono">ITEM_NAME</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="font-mono text-xs"
              placeholder="Enter item name..."
            />
          </div>

          <div>
            <Label className="text-xs font-mono">DESCRIPTION</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="font-mono text-xs"
              placeholder="Describe this item..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-mono">CATEGORY</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLOTHING">CLOTHING</SelectItem>
                  <SelectItem value="HAT">HAT</SelectItem>
                  <SelectItem value="ACCESSORY">ACCESSORY</SelectItem>
                  <SelectItem value="TOOL">TOOL</SelectItem>
                  <SelectItem value="CONSUMABLE">CONSUMABLE</SelectItem>
                  <SelectItem value="MATERIAL">MATERIAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-mono">RARITY</Label>
              <Select value={formData.rarity} onValueChange={(value) => setFormData({ ...formData, rarity: value })}>
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMMON">COMMON</SelectItem>
                  <SelectItem value="UNCOMMON">UNCOMMON</SelectItem>
                  <SelectItem value="RARE">RARE</SelectItem>
                  <SelectItem value="EPIC">EPIC</SelectItem>
                  <SelectItem value="LEGENDARY">LEGENDARY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs font-mono">ENERGY</Label>
              <Input
                type="number"
                value={formData.energy_effect}
                onChange={(e) => setFormData({ ...formData, energy_effect: parseInt(e.target.value) || 0 })}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-mono">HEALTH</Label>
              <Input
                type="number"
                value={formData.health_effect}
                onChange={(e) => setFormData({ ...formData, health_effect: parseInt(e.target.value) || 0 })}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-mono">DURABILITY</Label>
              <Input
                type="number"
                min="1"
                value={formData.durability}
                onChange={(e) => setFormData({ ...formData, durability: parseInt(e.target.value) || 100 })}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 font-mono text-xs"
              onClick={handleCreate}
              disabled={isProcessing || !formData.name || !formData.description}
            >
              CREATE_ITEM
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 font-mono text-xs"
              onClick={() => onOpenChange(false)}
            >
              CANCEL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
