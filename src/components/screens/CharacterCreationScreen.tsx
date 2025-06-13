// src/components/screens/CharacterCreationScreen.tsx - Updated with back button
import { User, Activity, ArrowLeft } from 'lucide-react'
import { CharacterCreationView } from '../views'
import { useGame } from '@/providers/GameProvider'
import { Button } from '@/components/ui/button'

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-3 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="text-primary font-bold text-sm">CHARACTER_CREATION v2.089</span>
          </div>
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Back to character selection"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 animate-pulse" />
              <span className="text-primary text-xs">READY</span>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-3">
          <div className="text-center">
            <div className="text-primary font-bold text-lg mb-1">WELCOME_TO_EARTH</div>
            <div className="text-muted-foreground text-sm">
              INITIALIZE_PROFILE_TO_BEGIN
            </div>
          </div>
        </div>

        <CharacterCreationView
          character={null}
          onCharacterCreated={handleCharacterCreated}
        />

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-2 mt-3">
          CHARACTER_SYSTEM_v2089 | PROFILE_REQUIRED
        </div>
      </div>
    </div>
  )
}
