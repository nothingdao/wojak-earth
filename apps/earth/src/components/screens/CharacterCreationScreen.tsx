// src/components/screens/CharacterCreationScreen.tsx - Updated with better styling
import { User, Activity, ArrowLeft } from 'lucide-react'
import { CharacterCreationView } from '../views'
import { useGame } from '@/providers/GameProvider'
import { TopControls } from '../TopControls'
import { Button } from '../ui/button'

interface CharacterCreationScreenProps {
  onBack?: () => void
}

export function CharacterCreationScreen({ onBack }: CharacterCreationScreenProps) {
  const { actions } = useGame()

  const handleCharacterCreated = async () => {
    console.log('🎉 Character creation completed, refreshing data...')
    try {
      // First, refresh the character data
      await actions.refetchCharacter()

      // Then signal that character creation is complete
      // This will trigger the state transition to 'entering-game'
      actions.createCharacterComplete()

      console.log('✅ Character creation flow completed')
    } catch (error) {
      console.error('Failed to refresh character after creation:', error)
      // Error will be handled by the GameProvider
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 mt-6">
      <TopControls />

      <div className="w-full max-w-2xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-success" />
            <span className="text-success font-bold text-sm">PLAYER_CREATION v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-success animate-pulse" />
            <span className="text-success text-xs">READY</span>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-muted/20 border border-success/20 rounded p-3 mb-4">
          <div className="text-center">
            <div className="text-success font-bold text-lg mb-1">WELCOME_TO_EARTH</div>
            <div className="text-muted-foreground text-sm">
              INITIALIZE_PROFILE_TO_BEGIN
            </div>
          </div>
        </div>

        <CharacterCreationView
          character={null}
          onCharacterCreated={handleCharacterCreated}
        />

        {onBack && (
          <div className="mt-4 pt-3 border-t border-primary/20">
            <Button
              onClick={onBack}
              className="w-full font-mono text-sm h-9 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-primary/30"
              variant="outline"
              size="sm"
              title="Back to character selection"
            >
              <ArrowLeft className="w-3 h-3 mr-2" />
              RETURN_TO_REGISTRY
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-2 mt-3">
          PLAYER_SYSTEM_v2089 | PROFILE_REQUIRED
        </div>
      </div>
    </div>
  )
}
