// src/components/admin/modals/EditLocationModal.tsx
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { Location, LocationType } from '@/types'
import { LOCATION_TYPES, CHAT_SCOPES } from '@/types'

// Get the ChatScope type from local admin types
type ChatScope = 'LOCAL' | 'REGIONAL' | 'GLOBAL'

interface EditLocationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: Location | null
  onSave: (locationId: string, updates: Partial<Location>) => Promise<void>
  isProcessing: boolean
}

export const EditLocationModal: React.FC<EditLocationModalProps> = ({
  open,
  onOpenChange,
  location,
  onSave,
  isProcessing
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location_type: 'REGION' as LocationType,
    biome: '',
    difficulty: 1,
    map_x: null as number | null,
    map_y: null as number | null,
    has_market: true,
    has_mining: true,
    has_travel: true,
    has_chat: true,
    has_exchange: false,
    chat_scope: 'LOCAL' as ChatScope,
    welcome_message: '',
    lore: '',
    min_level: null as number | null,
    entry_cost: null as number | null,
    is_private: false,
    image_url: '',
    svg_path_id: '',
    theme: '',
    is_explored: true,
    status: 'explored',
    territory: ''
  })

  // Update form data whenever location changes or modal opens
  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        description: location.description || '',
        location_type: location.location_type || 'REGION',
        biome: location.biome || '',
        difficulty: location.difficulty || 1,
        map_x: location.map_x,
        map_y: location.map_y,
        has_market: location.has_market ?? true,
        has_mining: location.has_mining ?? true,
        has_travel: location.has_travel ?? true,
        has_chat: location.has_chat ?? true,
        has_exchange: location.has_exchange ?? false,
        chat_scope: location.chat_scope || 'LOCAL',
        welcome_message: location.welcome_message || '',
        lore: location.lore || '',
        min_level: location.min_level,
        entry_cost: location.entry_cost,
        is_private: location.is_private ?? false,
        image_url: location.image_url || '',
        svg_path_id: location.svg_path_id || '',
        theme: location.theme || '',
        is_explored: location.is_explored ?? true,
        status: location.status || 'explored',
        territory: location.territory || ''
      })
    }
  }, [location, open])

  const handleSave = async () => {
    if (!location) return
    await onSave(location.id, formData)
  }

  const handleInputChange = (field: keyof typeof formData, value: string | number | boolean | null | ChatScope | LocationType) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const locationTypes = [...LOCATION_TYPES] as LocationType[]
  const chatScopes = [...CHAT_SCOPES] as ChatScope[]

  if (!location) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl font-mono max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">EDIT_LOCATION</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            MODIFY_LOCATION_PROPERTIES_AND_SETTINGS
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">LOCATION_NAME *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="font-mono text-xs"
                placeholder="ENTER_LOCATION_NAME"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">TERRITORY</Label>
              <Input
                value={formData.territory}
                onChange={(e) => handleInputChange('territory', e.target.value)}
                className="font-mono text-xs"
                placeholder="FACTION/OWNER"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-mono">DESCRIPTION *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="font-mono text-xs"
              placeholder="LOCATION_DESCRIPTION"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-xs font-mono">LORE</Label>
            <Textarea
              value={formData.lore}
              onChange={(e) => handleInputChange('lore', e.target.value)}
              className="font-mono text-xs"
              placeholder="BACKGROUND_STORY_AND_HISTORY"
              rows={2}
            />
          </div>

          {/* Type and Properties */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-mono">TYPE</Label>
              <Select
                value={formData.location_type}
                onValueChange={(value: LocationType) => handleInputChange('location_type', value)}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.map((type) => (
                    <SelectItem key={type} value={type} className="font-mono text-xs">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-mono">BIOME</Label>
              <Input
                value={formData.biome}
                onChange={(e) => handleInputChange('biome', e.target.value)}
                className="font-mono text-xs"
                placeholder="FOREST/DESERT/URBAN"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">DIFFICULTY</Label>
              <Input
                type="number"
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', parseInt(e.target.value) || 1)}
                className="font-mono text-xs"
                min="1"
                max="10"
              />
            </div>
          </div>

          {/* Map Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">MAP_X</Label>
              <Input
                type="number"
                value={formData.map_x || ''}
                onChange={(e) => handleInputChange('map_x', e.target.value ? parseInt(e.target.value) : null)}
                className="font-mono text-xs"
                placeholder="X_COORDINATE"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">MAP_Y</Label>
              <Input
                type="number"
                value={formData.map_y || ''}
                onChange={(e) => handleInputChange('map_y', e.target.value ? parseInt(e.target.value) : null)}
                className="font-mono text-xs"
                placeholder="Y_COORDINATE"
              />
            </div>
          </div>

          {/* Access Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">MIN_LEVEL</Label>
              <Input
                type="number"
                value={formData.min_level || ''}
                onChange={(e) => handleInputChange('min_level', e.target.value ? parseInt(e.target.value) : null)}
                className="font-mono text-xs"
                placeholder="MINIMUM_LEVEL"
                min="1"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">ENTRY_COST</Label>
              <Input
                type="number"
                value={formData.entry_cost || ''}
                onChange={(e) => handleInputChange('entry_cost', e.target.value ? parseInt(e.target.value) : null)}
                className="font-mono text-xs"
                placeholder="EARTH_TO_ENTER"
                min="0"
              />
            </div>
          </div>

          {/* Visual Assets */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">IMAGE_URL</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
                className="font-mono text-xs"
                placeholder="HTTP://EXAMPLE.COM/IMAGE.PNG"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">SVG_PATH_ID</Label>
              <Input
                value={formData.svg_path_id}
                onChange={(e) => handleInputChange('svg_path_id', e.target.value)}
                className="font-mono text-xs"
                placeholder="MAP_SVG_PATH_ID"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">THEME</Label>
              <Input
                value={formData.theme}
                onChange={(e) => handleInputChange('theme', e.target.value)}
                className="font-mono text-xs"
                placeholder="VISUAL_THEME"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">STATUS</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="explored" className="font-mono text-xs">EXPLORED</SelectItem>
                  <SelectItem value="unexplored" className="font-mono text-xs">UNEXPLORED</SelectItem>
                  <SelectItem value="rumors" className="font-mono text-xs">RUMORS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-mono">WELCOME_MESSAGE</Label>
            <Textarea
              value={formData.welcome_message}
              onChange={(e) => handleInputChange('welcome_message', e.target.value)}
              className="font-mono text-xs"
              placeholder="MESSAGE_SHOWN_WHEN_ENTERING"
              rows={2}
            />
          </div>

          {/* Features and Permissions */}
          <div className="space-y-3">
            <Label className="text-xs font-mono">FEATURES_AND_PERMISSIONS</Label>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_market"
                    checked={formData.has_market}
                    onCheckedChange={(checked) => handleInputChange('has_market', checked)}
                  />
                  <Label htmlFor="has_market" className="text-xs font-mono">HAS_MARKET</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_mining"
                    checked={formData.has_mining}
                    onCheckedChange={(checked) => handleInputChange('has_mining', checked)}
                  />
                  <Label htmlFor="has_mining" className="text-xs font-mono">HAS_MINING</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_travel"
                    checked={formData.has_travel}
                    onCheckedChange={(checked) => handleInputChange('has_travel', checked)}
                  />
                  <Label htmlFor="has_travel" className="text-xs font-mono">HAS_TRAVEL</Label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_chat"
                    checked={formData.has_chat}
                    onCheckedChange={(checked) => handleInputChange('has_chat', checked)}
                  />
                  <Label htmlFor="has_chat" className="text-xs font-mono">HAS_CHAT</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_exchange"
                    checked={formData.has_exchange}
                    onCheckedChange={(checked) => handleInputChange('has_exchange', checked)}
                  />
                  <Label htmlFor="has_exchange" className="text-xs font-mono">HAS_EXCHANGE</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_private"
                    checked={formData.is_private}
                    onCheckedChange={(checked) => handleInputChange('is_private', checked)}
                  />
                  <Label htmlFor="is_private" className="text-xs font-mono">IS_PRIVATE</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_explored"
                    checked={formData.is_explored}
                    onCheckedChange={(checked) => handleInputChange('is_explored', checked)}
                  />
                  <Label htmlFor="is_explored" className="text-xs font-mono">IS_EXPLORED</Label>
                </div>
              </div>
            </div>

            {formData.has_chat && (
              <div>
                <Label className="text-xs font-mono">CHAT_SCOPE</Label>
                <Select
                  value={formData.chat_scope}
                  onValueChange={(value: ChatScope) => handleInputChange('chat_scope', value)}
                >
                  <SelectTrigger className="font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chatScopes.map((scope) => (
                      <SelectItem key={scope} value={scope} className="font-mono text-xs">
                        {scope}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-primary/20">
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
