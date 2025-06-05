// src/components/WelcomeScreen.tsx
import React from 'react'
import { AppShell } from './AppShell'
import { SandboxView } from './views'
import type { GameView } from '@/types'

interface WelcomeScreenProps {
  onCharacterCreated: () => void
  currentView: GameView
  onProfileClick: () => void
  onHomeClick: () => void
  onMapClick: () => void
  onSandboxClick: () => void
  onInventoryClick: () => void
  onAdminClick?: () => void
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCharacterCreated,
  currentView,
  onProfileClick,
  onHomeClick,
  onMapClick,
  onSandboxClick,
  onInventoryClick,
  onAdminClick
}) => {
  return (
    <AppShell
      character={null}
      currentView={currentView}
      onProfileClick={onProfileClick}
      onHomeClick={onHomeClick}
      onMapClick={onMapClick}
      onSandboxClick={onSandboxClick}
      onInventoryClick={onInventoryClick}
      onAdminClick={onAdminClick}
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Welcome to Earth</h2>
        <p className="text-muted-foreground">Create your character to start playing</p>
      </div>

      <SandboxView
        character={null}
        onCharacterCreated={onCharacterCreated}
      />
    </AppShell>
  )
}
