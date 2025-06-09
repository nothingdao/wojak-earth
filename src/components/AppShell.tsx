// src/components/AppShell.tsx - Improved with layout stability
import React, { type ReactNode } from 'react'
import { BottomDrawerNav } from './BottomDrawerNav'
import { PlayerFastNav } from './PlayerFastNav'
import { useWallet } from '@solana/wallet-adapter-react'
import { isAdmin } from '@/config/admins'
import type { Character, GameView } from '@/types'

interface AppShellProps {
  character: Character | null
  children: ReactNode
  currentView: GameView
  showNavigation?: boolean
  onProfileClick: () => void
  onHomeClick: () => void
  onMapClick: () => void
  onInventoryClick: () => void
  onAdminClick?: () => void
  onCharactersClick?: () => void
  onCharacterCreationClick?: () => void
  onEconomyClick?: () => void
  onLeaderboardsClick?: () => void
  onRustMarketClick?: () => void
}

export const AppShell: React.FC<AppShellProps> = ({
  character,
  children,
  currentView,
  showNavigation = true,
  onProfileClick,
  onHomeClick,
  onMapClick,
  onInventoryClick,
  onAdminClick,
  onCharactersClick,
  onEconomyClick,
  onLeaderboardsClick,
  onRustMarketClick
}) => {
  const wallet = useWallet()
  const userIsAdmin = wallet.publicKey && isAdmin(wallet.publicKey.toString())

  // Check if current view should be fullscreen
  const isFullscreenView = currentView === 'map'

  return (
    <div className="min-h-screen">
      {/* Navigation - conditionally rendered but layout space preserved */}
      {showNavigation && (
        <>
          <BottomDrawerNav
            character={character}
            currentView={currentView}
            onProfileClick={onProfileClick}
            onHomeClick={onHomeClick}
            onMapClick={onMapClick}
            onInventoryClick={onInventoryClick}
            onAdminClick={userIsAdmin ? onAdminClick : undefined}
            isAdmin={!!userIsAdmin}
            onCharactersClick={onCharactersClick}
            onEconomyClick={onEconomyClick}
            onLeaderboardsClick={onLeaderboardsClick}
            onRustMarketClick={onRustMarketClick}
          />

          {/* PlayerFastNav - only show when character is loaded */}
          {character && (
            <PlayerFastNav
              character={character}
              currentView={currentView}
              onProfileClick={onProfileClick}
              onHomeClick={onHomeClick}
              onMapClick={onMapClick}
              onInventoryClick={onInventoryClick}
            />
          )}
        </>
      )}

      {/* Main content area with stable layout */}
      {isFullscreenView ? (
        // Fullscreen for map view
        <main
          className={`w-full ${showNavigation ? 'h-[calc(100vh-64px)]' : 'h-screen'}`}
          style={{ minHeight: showNavigation ? 'calc(100vh - 64px)' : '100vh' }}
        >
          {children}
        </main>
      ) : (
        // Normal container for other views
        <main
          className={`container mx-auto px-4 ${showNavigation ? 'py-6' : 'py-0'}`}
          style={{
            minHeight: showNavigation ? 'calc(100vh - 64px)' : '100vh',
            paddingBottom: showNavigation ? '6rem' : '0' // Account for bottom nav
          }}
        >
          <div className="max-w-2xl mx-auto">
            {children}
          </div>
        </main>
      )}
    </div>
  )
}
