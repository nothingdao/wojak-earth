// src/components/ConnectedPlayerWalletInfo.tsx
// this is a test component. We can delete later if we want...
import React, { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Wallet, RefreshCw, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export const ConnectedPlayerWalletInfo: React.FC = () => {
  const { publicKey, connected, wallet } = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchBalance = async () => {
    if (!publicKey) return

    setLoading(true)
    try {
      const balanceInLamports = await connection.getBalance(publicKey)
      setBalance(balanceInLamports / LAMPORTS_PER_SOL)
    } catch (error) {
      console.error('Error fetching balance:', error)
      setBalance(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance()
    } else {
      setBalance(null)
    }
  }, [connected, publicKey])

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString())
      toast.success('Address copied to clipboard!')
    }
  }

  const openInExplorer = () => {
    if (publicKey) {
      window.open(`https://amman-explorer.metaplex.com/#/address/${publicKey.toString()}?cluster=devnet`, '_blank')
    }
  }

  if (!connected || !publicKey) {
    return (
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Wallet className="w-4 h-4" />
          <span>No wallet connected</span>
        </div>
      </div>
    )
  }

  const shortAddress = `${publicKey.toString().slice(0, 8)}...${publicKey.toString().slice(-8)}`

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Connected Wallet
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchBalance}
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-3">
        {/* Wallet Name */}
        <div>
          <div className="text-xs text-muted-foreground">Wallet</div>
          <div className="text-sm font-medium">{wallet?.adapter.name || 'Unknown'}</div>
        </div>

        {/* Address */}
        <div>
          <div className="text-xs text-muted-foreground">Address</div>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {shortAddress}
            </code>
            <Button variant="ghost" size="sm" onClick={copyAddress}>
              <Copy className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={openInExplorer}>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Balance */}
        <div>
          <div className="text-xs text-muted-foreground">Balance</div>
          <div className="text-sm font-mono">
            {loading ? (
              <span className="text-muted-foreground">Loading...</span>
            ) : (
              <span>{balance?.toFixed(4) || '0.0000'} SOL</span>
            )}
          </div>
        </div>

        {/* Network Info */}
        <div>
          <div className="text-xs text-muted-foreground">Network</div>
          <div className="text-sm">Devnet</div>
        </div>
      </div>
    </div>
  )
}
