// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import '@fontsource/jetbrains-mono/100.css'
import '@/index.css'
import App from './App.tsx'
import { ThemeProvider } from '@/providers/ThemeProvider.tsx'
import { installClientLogCapture } from '@/lib/clientLogCapture'

installClientLogCapture()

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </ConvexProvider>
  </StrictMode>,
)
