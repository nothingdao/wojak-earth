// src/components/screens/RegistryDashboard.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  User,
  Activity,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react'
import { useNetwork } from '@/contexts/NetworkContext'
import { usePlayerCharacter } from '@/hooks/usePlayerCharacter'
import { TopControls } from '../TopControls'
import { CharacterCreationScreen } from './CharacterCreationScreen'

interface RegistryDashboardProps {
  onEnterGame?: () => void
}

export function RegistryDashboard({ onEnterGame }: RegistryDashboardProps) {
  const { isDevnet } = useNetwork()

  // Check character status (devnet only)
  const {
    character,
    loading: characterLoading,
    hasCharacter
  } = usePlayerCharacter(isDevnet)

  // Local navigation state
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)

  // Show sub-screens
  if (showCharacterCreation) {
    return (
      <CharacterCreationScreen
        onBack={() => setShowCharacterCreation(false)}
      />
    )
  }

  // Main dashboard
  const isLoading = characterLoading

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 mt-3 relative">
      <TopControls />

      <div className="w-full max-w-md mx-auto bg-background border border-primary/30 rounded-lg p-6 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm">EARTH_REGISTRY v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-success animate-pulse" />
            <span className="text-success text-xs">ONLINE</span>
          </div>
        </div>

        {/* Welcome Message */}
        {/* <div className="bg-background border rounded p-4 mb-4">
          <div className="text-center">
            <div className="text-primary font-bold text-lg mb-2">EARTH_REGISTRY</div>
            <div className="text-muted-foreground text-xs">
              Your gateway to EARTH 2089
            </div>
          </div>
        </div> */}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-muted/20 border border-primary/10 rounded p-4 mb-4">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Checking status...</span>
            </div>
          </div>
        )}

        {/* Status Display */}
        {!isLoading && (
          <div className="space-y-4">
            {/* Character Status */}
            <div className="bg-muted/20 border border-primary/10 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold text-sm">GAME_PLAYER</span>
                </div>
                <span className="text-xs text-muted-foreground">DEVNET</span>
              </div>

              {hasCharacter && character ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Player Found</span>
                  </div>

                  {/* Character Display */}
                  <div className="flex items-center gap-3 p-2 bg-background/50 rounded border border-primary/10">
                    {/* Character Image */}
                    <div className="relative w-24 h-24 rounded border border-primary/20 overflow-hidden bg-muted/20">
                      {character.current_image_url ? (
                        <img
                          src={character.current_image_url}
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Character Stats */}
                    <div className="flex-1 text-xs text-muted-foreground space-y-1">
                      <div>NAME: {character.name}</div>
                      <div>LEVEL: {character.level}</div>
                      <div>ENERGY: {character.energy}/100</div>
                      <div>EARTH: {character.earth}</div>
                    </div>
                  </div>

                  <Button
                    onClick={onEnterGame}
                    variant="outline"
                    className="w-full font-mono text-sm h-8 mt-2"
                    size="sm"
                  >
                    <Zap className="w-3 h-3 mr-2" />
                    ENTER_GAME
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">No PLayer Found</span>
                  </div>
                  <Button
                    onClick={() => setShowCharacterCreation(true)}
                    variant="outline"
                  >
                    <User className="w-3 h-3 mr-2" />
                    CREATE_PLAYER
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Help */}
            <div className="bg-muted/20 border border-primary/10 rounded p-3">
              <div className="text-xs text-muted-foreground font-mono">
                <div className="text-primary text-xs font-bold mb-2">[NEXT_STEP]</div>
                <div className="space-y-1">
                  <div>• Create a player if this wallet is new.</div>
                  <div>• Enter Earth if this wallet already has a player.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground/60 font-mono text-center border-t border-primary/20 pt-3 mt-4">
          REGISTRY_v2089 | EARTH_PROTOCOL
        </div>
      </div>
    </div >
  )
}
