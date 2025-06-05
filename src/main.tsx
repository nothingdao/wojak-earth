// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { SolanaWalletProvider } from './components/wallet-provider.tsx'
import { NetworkProvider } from '@/contexts/NetworkContext'
import { NetworkSwitcher } from '@/components/NetworkSwitcher'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <NetworkProvider>


        <SolanaWalletProvider>
          <NetworkSwitcher />
          <App />
        </SolanaWalletProvider>
      </NetworkProvider>
    </ThemeProvider>
  </StrictMode>,
)
