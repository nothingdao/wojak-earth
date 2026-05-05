// src/components/admin/modals/EditCharacterModal.tsx
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Character } from '@/types'

interface EditCharacterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  character: Character | null
  onSave: (characterId: string, updates: Partial<Character>) => Promise<void>
  isProcessing: boolean
}

export const EditCharacterModal: React.FC<EditCharacterModalProps> = ({
  open,
  onOpenChange,
  character,
  onSave,
  isProcessing
}) => {
  const [formData, setFormData] = useState({
    level: 1,
    earth: 0,
    health: 100,
    energy: 100,
    experience: 0
  })

  // Update form data whenever character changes or modal opens
  useEffect(() => {
    if (character) {
      setFormData({
        level: character.level || 1,
        earth: character.earth || 0,
        health: character.health || 100,
        energy: character.energy || 100,
        experience: character.experience || 0
      })
    }
  }, [character, open]) // Include 'open' to reset form when modal opens

  const handleSave = async () => {
    if (!character) return
    await onSave(character.id, formData)
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseInt(value) || 0
    setFormData(prev => ({ ...prev, [field]: numValue }))
  }

  if (!character) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono">EDIT_PLAYER</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            MODIFY_PLAYER_STATS_AND_ATTRIBUTES
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-mono">PLAYER_NAME</Label>
            <Input
              value={character.name}
              className="font-mono text-xs"
              readOnly
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-mono">LEVEL</Label>
              <Input
                type="number"
                value={formData.level}
                onChange={(e) => handleInputChange('level', e.target.value)}
                className="font-mono text-xs"
                min="1"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">EARTH</Label>
              <Input
                type="number"
                value={formData.earth}
                onChange={(e) => handleInputChange('earth', e.target.value)}
                className="font-mono text-xs"
                min="0"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-mono">EXPERIENCE_POINTS</Label>
            <Input
              type="number"
              value={formData.experience}
              onChange={(e) => handleInputChange('experience', e.target.value)}
              className="font-mono text-xs"
              min="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-mono">HEALTH</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.health}
                onChange={(e) => handleInputChange('health', e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">ENERGY</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.energy}
                onChange={(e) => handleInputChange('energy', e.target.value)}
                className="font-mono text-xs"
              />
            </div>
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
