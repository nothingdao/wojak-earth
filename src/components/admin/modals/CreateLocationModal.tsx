// src/components/admin/modals/CreateLocationModal.tsx
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface CreateLocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (locationData: any) => Promise<void>
  isProcessing: boolean
}

export const CreateLocationModal: React.FC<CreateLocationModalProps> = ({
  open,
  onOpenChange,
  onCreate,
  isProcessing
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    biome: 'plains',
    difficulty: 1,
    has_market: false,
    has_mining: false,
    has_travel: true,
    has_chat: true,
    is_private: false,
    min_level: 1,
    entry_cost: 0
  })

  const handleCreate = async () => {
    await onCreate(formData)
    setFormData({
      name: '',
      description: '',
      biome: 'plains',
      difficulty: 1,
      has_market: false,
      has_mining: false,
      has_travel: true,
      has_chat: true,
      is_private: false,
      min_level: 1,
      entry_cost: 0
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono">CREATE_LOCATION</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            ADD_NEW_EXPLORABLE_AREA_TO_WORLD
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <div>
            <Label className="text-xs font-mono">LOCATION_NAME</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="font-mono text-xs"
              placeholder="Enter location name..."
            />
          </div>

          <div>
            <Label className="text-xs font-mono">DESCRIPTION</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="font-mono text-xs"
              placeholder="Describe this location..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-mono">BIOME</Label>
              <Select value={formData.biome} onValueChange={(value) => setFormData({ ...formData, biome: value })}>
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plains">PLAINS</SelectItem>
                  <SelectItem value="desert">DESERT</SelectItem>
                  <SelectItem value="urban">URBAN</SelectItem>
                  <SelectItem value="digital">DIGITAL</SelectItem>
                  <SelectItem value="underground">UNDERGROUND</SelectItem>
                  <SelectItem value="wilderness">WILDERNESS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-mono">DIFFICULTY</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-mono">MIN_LEVEL</Label>
              <Input
                type="number"
                min="1"
                value={formData.min_level}
                onChange={(e) => setFormData({ ...formData, min_level: parseInt(e.target.value) })}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-mono">ENTRY_COST</Label>
              <Input
                type="number"
                min="0"
                value={formData.entry_cost}
                onChange={(e) => setFormData({ ...formData, entry_cost: parseInt(e.target.value) })}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-mono">FEATURES</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_market"
                  checked={formData.has_market}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_market: checked as boolean })}
                />
                <Label htmlFor="has_market" className="text-xs font-mono">MARKET</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_mining"
                  checked={formData.has_mining}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_mining: checked as boolean })}
                />
                <Label htmlFor="has_mining" className="text-xs font-mono">MINING</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_travel"
                  checked={formData.has_travel}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_travel: checked as boolean })}
                />
                <Label htmlFor="has_travel" className="text-xs font-mono">TRAVEL</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_chat"
                  checked={formData.has_chat}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_chat: checked as boolean })}
                />
                <Label htmlFor="has_chat" className="text-xs font-mono">CHAT</Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_private"
                checked={formData.is_private}
                onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked as boolean })}
              />
              <Label htmlFor="is_private" className="text-xs font-mono">PRIVATE_LOCATION</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 font-mono text-xs"
              onClick={handleCreate}
              disabled={isProcessing || !formData.name || !formData.description}
            >
              CREATE_LOCATION
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
