// src/components/TopControls.tsx
import { ModeToggle } from './mode-toggle'
import { WalletConnectButton } from './wallet-connect-button'

interface TopControlsProps {
  className?: string
}

export function TopControls({ className = '' }: TopControlsProps) {
  return (
    <div className={`fixed top-4 right-4 z-40 flex items-center gap-2 ${className}`}>
      <ModeToggle />
      <WalletConnectButton />
    </div>
  )
}
