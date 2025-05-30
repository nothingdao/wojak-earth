// src/components/views/ProfileView.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  User,
  Wallet,
  Copy,
  ExternalLink,
  RefreshCw,
  Zap,
  Heart,
  Package,
  Coins,
} from 'lucide-react'
import { useWalletInfo } from '@/hooks/useWalletInfo'
import { toast } from 'sonner'
import type { Character } from '@/types'
// import { TokenMintForm } from '../TokenMintForm'

interface ProfileViewProps {
  character: Character
}

export const ProfileView: React.FC<ProfileViewProps> = ({ character }) => {
  const walletInfo = useWalletInfo()
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

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

  return (
    <div className='space-y-6'>
      {/* Character Section */}
      <div className='bg-card border rounded-lg p-6'>
        <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
          <User className='w-5 h-5' />
          Character Profile
        </h3>

        <div className='text-center mb-4'>
          {/* Character Image */}
          <div className='w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative'>
            {imageLoading && (
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              </div>
            )}

            {!imageError ? (
              <img
                src='/wojak.png'
                alt={character.name}
                className='w-full h-full object-cover'
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
            ) : (
              <div className='text-4xl'>🥺</div>
            )}
          </div>

          <h2 className='text-xl font-bold'>{character.name}</h2>
          <p className='text-muted-foreground'>Level {character.level}</p>
        </div>

        {/* Character Stats */}
        <div className='grid grid-cols-2 gap-4 mb-4'>
          <div className='bg-muted/30 rounded-lg p-3 text-center'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Zap className='w-4 h-4 text-yellow-500' />
              <span className='font-medium'>Energy</span>
            </div>
            <div className='text-lg font-bold'>{character.energy}/100</div>
          </div>

          <div className='bg-muted/30 rounded-lg p-3 text-center'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Heart className='w-4 h-4 text-red-500' />
              <span className='font-medium'>Health</span>
            </div>
            <div className='text-lg font-bold'>{character.health}/100</div>
          </div>

          <div className='bg-muted/30 rounded-lg p-3 text-center'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Coins className='w-4 h-4 text-yellow-600' />
              <span className='font-medium'>Coins</span>
            </div>
            <div className='text-lg font-bold'>{character.coins}</div>
          </div>

          <div className='bg-muted/30 rounded-lg p-3 text-center'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Package className='w-4 h-4 text-blue-500' />
              <span className='font-medium'>Items</span>
            </div>
            <div className='text-lg font-bold'>
              {character.inventory.length}
            </div>
          </div>
        </div>

        {/* Current Location */}
        <div className='bg-muted/30 rounded-lg p-3'>
          <div className='text-sm text-muted-foreground mb-1'>
            Current Location
          </div>
          <div className='font-medium'>{character.currentLocation.name}</div>
          <div className='text-sm text-muted-foreground'>
            {character.currentLocation.description}
          </div>
        </div>
      </div>

      {/* Wallet Section */}
      <div className='bg-card border rounded-lg p-6'>

        {/* {walletInfo.connected && (
          <TokenMintForm />
        )} */}

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

            {/* Equipped Items Preview */}
            {character.inventory.filter((item) => item.isEquipped).length >
              0 && (
                <div>
                  <div className='text-sm text-muted-foreground mb-2'>
                    Currently Equipped
                  </div>
                  <div className='space-y-1'>
                    {character.inventory
                      .filter((item) => item.isEquipped)
                      .slice(0, 3)
                      .map((item) => (
                        <div
                          key={item.id}
                          className='flex items-center justify-between bg-muted/30 rounded p-2 text-sm'
                        >
                          <span className='font-medium'>{item.item.name}</span>
                          <span className='text-xs text-muted-foreground capitalize'>
                            {item.item.category.toLowerCase()}
                          </span>
                        </div>
                      ))}
                    {character.inventory.filter((item) => item.isEquipped)
                      .length > 3 && (
                        <div className='text-xs text-muted-foreground text-center'>
                          +
                          {character.inventory.filter((item) => item.isEquipped)
                            .length - 3}{' '}
                          more items
                        </div>
                      )}
                  </div>
                </div>
              )}
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

    </div>
  )
}
