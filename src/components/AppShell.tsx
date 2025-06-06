import React, { type ReactNode } from 'react'
import { BottomDrawerNav } from './BottomDrawerNav'
import { useWallet } from '@solana/wallet-adapter-react'
import { isAdmin } from '@/config/admins'
import type { Character, GameView } from '@/types'

interface AppShellProps {
  character: Character | null
  children: ReactNode
  currentView: GameView
  onProfileClick: () => void
  onHomeClick: () => void
  onMapClick: () => void
  onSandboxClick: () => void
  onInventoryClick: () => void
  onAdminClick?: () => void
}

export const AppShell: React.FC<AppShellProps> = ({
  character,
  children,
  currentView,
  onProfileClick,
  onHomeClick,
  onMapClick,
  onSandboxClick,
  onInventoryClick,
  onAdminClick
}) => {
  const wallet = useWallet()
  const userIsAdmin = wallet.publicKey && isAdmin(wallet.publicKey.toString())

  // Check if current view should be fullscreen
  const isFullscreenView = currentView === 'map'

  return (
    <div className="min-h-screen bg-background">
      <BottomDrawerNav
        character={character}
        currentView={currentView}
        onProfileClick={onProfileClick}
        onHomeClick={onHomeClick}
        onMapClick={onMapClick}
        onSandboxClick={onSandboxClick}
        onInventoryClick={onInventoryClick}
        onAdminClick={userIsAdmin ? onAdminClick : undefined}
        isAdmin={!!userIsAdmin}
      />

      {/* Conditional container based on view */}
      {isFullscreenView ? (
        // Fullscreen for map view - no container, no padding, fill viewport
        <main className="w-full h-screen">
          {children}
        </main>
      ) : (
        // Normal container for other views
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            {children}
          </div>
        </main>
      )}
    </div>
  )
}
