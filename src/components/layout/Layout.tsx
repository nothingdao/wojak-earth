// src/components/layout/Layout.tsx
import { type ReactNode } from 'react'
import { BottomDrawerNav } from '../BottomDrawerNav'
import { useGame } from '@/providers/GameProvider'
import { useWallet } from '@solana/wallet-adapter-react'
import { isAdmin } from '@/config/admins'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { state, actions } = useGame()
  const wallet = useWallet()
  const userIsAdmin = wallet.publicKey && isAdmin(wallet.publicKey.toString())

  // Check if current view should be fullscreen
  const isFullscreenView = state.currentView === 'map'

  return (
    <div className="min-h-screen">
      {/* Bottom Navigation */}
      <BottomDrawerNav
        character={state.character}
        currentView={state.currentView}
        onProfileClick={() => actions.navigate('profile')}
        onHomeClick={() => actions.navigate('main')}
        onMapClick={() => actions.navigate('map')}
        onInventoryClick={() => actions.navigate('inventory')}
        onAdminClick={userIsAdmin ? () => actions.navigate('admin') : undefined}
        isAdmin={!!userIsAdmin}
        onCharactersClick={() => actions.navigate('characters')}
        onEconomyClick={() => actions.navigate('economy')}
        onLeaderboardsClick={() => actions.navigate('leaderboards')}
        onRustMarketClick={() => actions.navigate('rust-market')}
      />



      {/* Main content area with stable layout */}
      {isFullscreenView ? (
        // Fullscreen for map view
        <main
          className="w-full h-[calc(100vh-64px)]"
          style={{ minHeight: 'calc(100vh - 64px)' }}
        >
          {children}
        </main>
      ) : (
        // Normal container for other views
        <main
          className="container mx-auto px-4 py-6"
          style={{
            minHeight: 'calc(100vh - 64px)',
            paddingBottom: '6rem' // Account for bottom nav
          }}
        >
          <div className="max-w-2xl mx-auto md:pt-8">
            {children}
          </div>
        </main>
      )}
    </div>
  )
}
