// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import '@fontsource/jetbrains-mono/100.css'
import '@/index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/providers/ThemeProvider.tsx'
import { SolanaWalletProvider } from '@/providers/SolanaWalletProvider.tsx'
import { NetworkProvider } from '@/contexts/NetworkContext'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <NetworkProvider>
          <SolanaWalletProvider>
            <App />
          </SolanaWalletProvider>
        </NetworkProvider>
      </ThemeProvider>
    </ConvexProvider>
  </StrictMode>,
)
