// src/App.tsx - Clean, minimal, just orchestration
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { GameProvider } from '@/providers/GameProvider'
import { AppRouter } from '@/components/AppRouter'
import { Toaster } from 'sonner'

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css'
import { useEffect } from 'react'

// Wallet configuration
const network = WalletAdapterNetwork.Devnet
const endpoint = clusterApiUrl(network)

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter({ network }),
]

export default function App() {
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
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <GameProvider>
            <AppRouter />
            <Toaster />
          </GameProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
