// src/components/views/SandboxView.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  Copy,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { useWalletInfo } from '@/hooks/useWalletInfo'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import type { Character } from '@/types'

interface SandboxViewProps {
  character: Character
}

export const SandboxView: React.FC<SandboxViewProps> = () => {
  const walletInfo = useWalletInfo()
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)

  const copyAddress = () => {
    if (walletInfo.fullAddress) {
      navigator.clipboard.writeText(walletInfo.fullAddress)
      toast.success('Address copied to clipboard!')
    }
  }

  const openInExplorer = () => {
    if (walletInfo.fullAddress) {
      window.open(
        `https://explorer.solana.com/address/${walletInfo.fullAddress}?cluster=devnet`,
        '_blank'
      )
    }
  }

  // Netlify function NFT minting
  const mintNFT = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Connect wallet first')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/.netlify/functions/mint-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: wallet.publicKey.toString(),
          playerName: 'Player Character',
          playerAttributes: {
            level: 1,
            class: 'Adventurer',
            power: 100
          }
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`NFT minted! ${result.mintAddress}`)
        console.log('NFT Mint:', result.mintAddress)
        console.log('Transaction:', result.signature)
        console.log('Metadata:', result.metadataUri)
      } else {
        throw new Error(result.error)
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error('Mint failed:', error)

        toast.error(`Failed: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>

      {/* Wallet Section */}
      <div className='bg-card border rounded-lg p-6'>

        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold flex items-center gap-2'>
            <Wallet className='w-5 h-5' />
            Wallet Information
          </h3>

          <div className="flex items-center gap-2">

            {walletInfo.connected && (
              <Button
                variant='ghost'
                size='sm'
                onClick={walletInfo.refreshBalance}
                disabled={walletInfo.loading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${walletInfo.loading ? 'animate-spin' : ''}`}
                />
              </Button>
            )}
          </div>
        </div>

        {walletInfo.connected ? (
          <div className='space-y-4'>
            {/* Wallet Name */}
            <div>
              <div className='text-sm text-muted-foreground mb-1'>Wallet</div>
              <div className='font-medium'>{walletInfo.walletName}</div>
            </div>

            {/* Address */}
            <div>
              <div className='text-sm text-muted-foreground mb-1'>Address</div>
              <div className='flex items-center gap-2'>
                <code className='text-sm font-mono bg-muted px-3 py-2 rounded flex-1'>
                  {walletInfo.shortAddress}
                </code>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={copyAddress}
                >
                  <Copy className='w-4 h-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={openInExplorer}
                >
                  <ExternalLink className='w-4 h-4' />
                </Button>
              </div>
            </div>

            {/* Balance */}
            <div className='bg-muted/30 rounded-lg p-4'>
              <div className='text-sm text-muted-foreground mb-1'>
                SOL Balance
              </div>
              <div className='text-2xl font-bold font-mono'>
                {walletInfo.loading ? (
                  <span className='text-muted-foreground'>Loading...</span>
                ) : (
                  <span>{walletInfo.balance?.toFixed(4) || '0.0000'} SOL</span>
                )}
              </div>
              <div className='text-sm text-muted-foreground mt-1'>Devnet</div>
            </div>


          </div>
        ) : (
          <div className='text-center py-8'>
            <Wallet className='w-12 h-12 mx-auto text-muted-foreground mb-3' />
            <div className='text-muted-foreground mb-2'>
              No wallet connected
            </div>
            <div className='text-sm text-muted-foreground'>
              Connect your Solana wallet to view balance and transaction history
            </div>
          </div>
        )}
      </div>

      {/* NFT Minting Section */}
      {walletInfo.connected && (
        <div className='bg-card border rounded-lg p-6'>
          <h3 className='text-lg font-semibold mb-4'>Mint Player NFT</h3>

          <Button
            onClick={mintNFT}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Minting...
              </>
            ) : (
              'Mint Player Character NFT'
            )}
          </Button>
        </div>
      )}

    </div>
  )
}
