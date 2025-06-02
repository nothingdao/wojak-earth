// src/components/views/MiningView.tsx - FIXED VERSION
import { Button } from '@/components/ui/button'
import { Pickaxe, Loader2 } from 'lucide-react'
import type { Character } from '@/types'

interface MiningViewProps {
  character: Character
  loadingItems: Set<string>
  onMine: () => void
}

export function MiningView({ character, loadingItems, onMine }: MiningViewProps) {
  const isMining = loadingItems.has('mining-action')
  const canMine = character.energy >= 10 && !isMining

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Mining in {character.currentLocation.name}</h3>
      <p className="text-sm text-muted-foreground">
        Search for resources. Each attempt costs 10 energy.
      </p>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Available Resources:</h4>
        <div className="text-sm text-muted-foreground">
          Resources vary by location. Try your luck!
        </div>
      </div>

      <Button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onMine()
        }}
        className="w-full"
        disabled={!canMine}
      >
        {isMining ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Mining...
          </>
        ) : (
          <>
            <Pickaxe className="w-4 h-4 mr-2" />
            Mine for Resources
          </>
        )}
      </Button>

      {character.energy < 10 && !isMining && (
        <p className="text-sm text-center text-muted-foreground">
          Not enough energy! Use an Energy Drink to restore energy.
        </p>
      )}
    </div>
  )
}
