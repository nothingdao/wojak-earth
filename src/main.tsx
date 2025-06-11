// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/jetbrains-mono/100.css'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { SolanaWalletProvider } from './components/wallet-provider.tsx'
import { NetworkProvider } from '@/contexts/NetworkContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <NetworkProvider>
        <SolanaWalletProvider>
          <App />
        </SolanaWalletProvider>
      </NetworkProvider>
    </ThemeProvider>
  </StrictMode>,
)
