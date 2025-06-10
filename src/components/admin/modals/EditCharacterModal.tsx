// src/components/admin/modals/EditCharacterModal.tsx
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AdminCharacter } from '../types'

interface EditCharacterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  character: AdminCharacter | null
  onSave: (characterId: string, updates: Partial<AdminCharacter>) => Promise<void>
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
    level: character?.level || 1,
    coins: character?.coins || 0,
    health: character?.health || 100,
    energy: character?.energy || 100
  })

  const handleSave = async () => {
    if (!character) return
    await onSave(character.id, formData)
  }

  if (!character) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono">EDIT_CHARACTER</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            MODIFY_CHARACTER_STATS_AND_ATTRIBUTES
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-mono">CHARACTER_NAME</Label>
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
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">COINS</Label>
              <Input
                type="number"
                value={formData.coins}
                onChange={(e) => setFormData({ ...formData, coins: parseInt(e.target.value) })}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-mono">HEALTH</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.health}
                onChange={(e) => setFormData({ ...formData, health: parseInt(e.target.value) })}
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
                onChange={(e) => setFormData({ ...formData, energy: parseInt(e.target.value) })}
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
              SAVE_CHANGES
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
