// src/components/NetworkSwitcher.tsx
import React from 'react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { useNetwork } from '@/contexts/NetworkContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Globe, TestTube, AlertTriangle } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export const NetworkSwitcher: React.FC = () => {
  const { network, setNetwork, isDevnet, isMainnet } = useNetwork()

  const handleNetworkChange = (newNetwork: WalletAdapterNetwork) => {
    if (newNetwork === network) return

    setNetwork(newNetwork)

    const networkName = newNetwork === WalletAdapterNetwork.Mainnet ? 'Mainnet' : 'Devnet'
    toast.success(`Switched to ${networkName}`, {
      description: 'Please reconnect your wallet if needed'
    })

    // Reload the page to ensure clean wallet state
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {isDevnet ? (
            <>
              <TestTube className="w-3 h-3" />
              <span>Devnet</span>
            </>
          ) : (
            <>
              <Globe className="w-3 h-3" />
              <span>Mainnet</span>
            </>
          )}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleNetworkChange(WalletAdapterNetwork.Devnet)}
          className="gap-2"
        >
          <TestTube className="w-4 h-4" />
          <div className="flex-1">
            <div className="font-medium">Devnet</div>
            <div className="text-xs text-muted-foreground">
              For testing & development
            </div>
          </div>
          {isDevnet && <Badge variant="secondary" className="text-xs">Active</Badge>}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleNetworkChange(WalletAdapterNetwork.Mainnet)}
          className="gap-2"
        >
          <Globe className="w-4 h-4" />
          <div className="flex-1">
            <div className="font-medium">Mainnet</div>
            <div className="text-xs text-muted-foreground">
              Real SOL & transactions
            </div>
          </div>
          {isMainnet && <Badge variant="secondary" className="text-xs">Active</Badge>}
        </DropdownMenuItem>

        {isMainnet && (
          <div className="px-2 py-1 text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Real money involved!</span>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
