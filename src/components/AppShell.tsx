// Updated src/components/AppShell.tsx with Better Responsive Design
import React, { type ReactNode } from 'react'
import { GlobalNavbar } from './global-navbar'
// import { LocalRadio } from './LocalRadio'
import { NetworkSwitcher } from './NetworkSwitcher'
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

  return (
    <div className="min-h-screen bg-background">
      <GlobalNavbar
        character={character}
        currentLocation={character?.currentLocation?.name || "Earth"}
        onProfileClick={onProfileClick}
        onHomeClick={onHomeClick}
        onMapClick={onMapClick}
        onSandboxClick={onSandboxClick}
        onInventoryClick={onInventoryClick}
        onAdminClick={
          wallet.publicKey && isAdmin(wallet.publicKey.toString())
            ? onAdminClick
            : undefined
        }
        networkSwitcher={<NetworkSwitcher />}
      />

      <div className="container mx-auto px-4 py-6">
        {/* Improved max-width: good for mobile, better for desktop half-screen */}
        <div className="max-w-2xl mx-auto">
          {/* Persistent Radio Bar */}
          {character && (
            <div className="mb-4">
              {/* <LocalRadio locationId={character.currentLocation.id} /> */}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}
