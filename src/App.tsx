// src/App.tsx - Fixed with reactive endpoint
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { NetworkProvider, useNetwork } from '@/contexts/NetworkContext'
import { GameProvider } from '@/providers/GameProvider'
import { AppRouter } from '@/components/AppRouter'
import { Toaster } from 'sonner'
import { useState, useEffect, useMemo } from 'react'

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css'

// Dynamic connection provider that reacts to network changes
function DynamicConnectionProvider({ children }: { children: React.ReactNode }) {
  const { network, getRpcUrl } = useNetwork()

  // Use getRpcUrl() from context for consistency, or fallback to clusterApiUrl
  const endpoint = useMemo(() => {
    const url = getRpcUrl()
    console.log('🔗 ConnectionProvider using endpoint:', url, 'for network:', network)
    return url
  }, [network, getRpcUrl])

  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network }),
  ], [network])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default function App() {
  // Network state - starts with devnet
  const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet)

  // Prevent zoom (from your existing code)
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    const preventKeyboardZoom = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault()
      }
    }
    document.addEventListener('wheel', preventZoom, { passive: false })
    document.addEventListener('keydown', preventKeyboardZoom)
    return () => {
      document.removeEventListener('wheel', preventZoom)
      document.removeEventListener('keydown', preventKeyboardZoom)
    }
  }, [])

  return (
    <NetworkProvider network={network} setNetwork={setNetwork}>
      <DynamicConnectionProvider>
        <GameProvider>
          <AppRouter />
          <Toaster />
        </GameProvider>
      </DynamicConnectionProvider>
    </NetworkProvider>
  )
}
