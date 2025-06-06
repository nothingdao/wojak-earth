// src/components/views/ProfileView.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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
  Shield,
  Star,
  Globe,
  Hash,
  Calendar,
  Award,
  Layers,
} from 'lucide-react'
import { useWalletInfo } from '@/hooks/useWalletInfo'
import { toast } from 'sonner'
import type { Character } from '@/types'
import { BurnCharacter } from '../BurnCharacter'
import { useNetwork } from '@/contexts/NetworkContext'

interface ProfileViewProps {
  character: Character
  onCharacterUpdated?: () => void
}

export const ProfileView: React.FC<ProfileViewProps> = ({ character, onCharacterUpdated }) => {
  console.log('🖼️ ProfileView render - coins:', character.coins, 'character ID:', character.id, 'object ref:', character)


  const walletInfo = useWalletInfo()
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const { getExplorerUrl, isDevnet } = useNetwork()

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const getCharacterImageUrl = () => {
    if (imageError || !character.currentImageUrl) {
      return '/wojak.png'
    }
    return character.currentImageUrl
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const openInExplorer = (address: string) => {
    window.open(getExplorerUrl(address), '_blank')
  }

  const renderCharacterProfile = () => (
    <div className='space-y-4'>
      {/* Character Header */}
      <div className='bg-card border rounded-lg p-6'>
        <div className='flex flex-col items-center text-center mb-6'>
          {/* Character Image */}
          <div className='w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-4 overflow-hidden relative'>
            {imageLoading && (
              <div className='absolute inset-0 flex items-center justify-center'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              </div>
            )}

            {!imageError ? (
              <img
                src={getCharacterImageUrl()}
                alt={character.name}
                className='w-full h-full object-cover'
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
            ) : (
              <div className='text-6xl'>🥺</div>
            )}
          </div>

          {/* Character Title */}
          <div className='flex items-center gap-2 mb-2'>
            <h2 className='text-2xl font-bold'>{character.name}</h2>
            <Badge variant="secondary" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Level {character.level}
            </Badge>
          </div>

          <p className='text-muted-foreground mb-3'>
            {character.gender} {character.characterType}
          </p>

          {/* Status Badges */}
          <div className='flex gap-2 mb-4'>
            <Badge variant={character.status === 'ACTIVE' ? 'default' : 'secondary'}>
              <Shield className="w-3 h-3 mr-1" />
              {character.status || 'Active'}
            </Badge>
            <Badge variant="outline">
              <Hash className="w-3 h-3 mr-1" />
              Version {character.currentVersion}
            </Badge>
            {isDevnet && (
              <Badge variant="outline" className="text-orange-600">
                <Globe className="w-3 h-3 mr-1" />
                Devnet
              </Badge>
            )}
          </div>

          {/* Character ID */}
          <div className='text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded'>
            ID: {character.id}
          </div>
        </div>

        {/* Character Stats Grid */}
        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div className='bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 rounded-lg p-3 text-center border'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Zap className='w-4 h-4 text-yellow-600' />
              <span className='font-medium text-sm'>Energy</span>
            </div>
            <div className='text-xl font-bold text-yellow-700 dark:text-yellow-300'>
              {character.energy}/100
            </div>
          </div>

          <div className='bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg p-3 text-center border'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Heart className='w-4 h-4 text-red-600' />
              <span className='font-medium text-sm'>Health</span>
            </div>
            <div className='text-xl font-bold text-red-700 dark:text-red-300'>
              {character.health}/100
            </div>
          </div>

          <div className='bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 rounded-lg p-3 text-center border'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Coins className='w-4 h-4 text-amber-600' />
              <span className='font-medium text-sm'>Coins</span>
            </div>
            <div className='text-xl font-bold text-amber-700 dark:text-amber-300'>
              {character.coins.toLocaleString()}
            </div>
          </div>

          <div className='bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg p-3 text-center border'>
            <div className='flex items-center justify-center gap-1 mb-1'>
              <Package className='w-4 h-4 text-blue-600' />
              <span className='font-medium text-sm'>Items</span>
            </div>
            <div className='text-xl font-bold text-blue-700 dark:text-blue-300'>
              {character.inventory.length}
            </div>
          </div>
        </div>

        {/* Current Location */}
        <div className='bg-muted/30 rounded-lg p-4 border'>
          <div className='flex items-center gap-2 mb-2'>
            <Globe className='w-4 h-4 text-green-600' />
            <span className='text-sm font-medium text-muted-foreground'>Current Location</span>
          </div>
          <div className='font-semibold text-lg'>{character.currentLocation.name}</div>
          <div className='text-sm text-muted-foreground mt-1'>
            {character.currentLocation.description}
          </div>
        </div>
      </div>

      {/* NFT Metadata Section */}
      {character.nftAddress && (
        <div className='bg-card border rounded-lg p-6'>
          <div className='flex items-center gap-2 mb-4'>
            <Layers className='w-5 h-5 text-purple-600' />
            <h3 className='text-lg font-semibold'>NFT Metadata</h3>
          </div>

          <div className='space-y-4'>
            {/* NFT Address */}
            <div>
              <label className='text-sm font-medium text-muted-foreground mb-1 block'>
                NFT Address
              </label>
              <div className='flex items-center gap-2'>
                <code className='text-sm font-mono bg-muted px-3 py-2 rounded flex-1 break-all'>
                  {character.nftAddress}
                </code>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => copyToClipboard(character.nftAddress!, 'NFT address')}
                >
                  <Copy className='w-4 h-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => openInExplorer(character.nftAddress!)}
                >
                  <ExternalLink className='w-4 h-4' />
                </Button>
              </div>
            </div>

            {/* Metadata URI */}
            <div>
              <label className='text-sm font-medium text-muted-foreground mb-1 block'>
                Metadata URI
              </label>
              <div className='flex items-center gap-2'>
                <code className='text-sm font-mono bg-muted px-3 py-2 rounded flex-1 break-all'>
                  https://earth.ndao.computer/.netlify/functions/metadata/{character.id}
                </code>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => copyToClipboard(
                    `https://earth.ndao.computer/.netlify/functions/metadata/${character.id}`,
                    'Metadata URI'
                  )}
                >
                  <Copy className='w-4 h-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => window.open(
                    `https://earth.ndao.computer/.netlify/functions/metadata/${character.id}`,
                    '_blank'
                  )}
                >
                  <ExternalLink className='w-4 h-4' />
                </Button>
              </div>
            </div>

            {/* Collection Info */}
            <div>
              <label className='text-sm font-medium text-muted-foreground mb-1 block'>
                Collection
              </label>
              <div className='flex items-center gap-2'>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Wojak Earth Characters
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Verified ✓
                </Badge>
              </div>
            </div>

            {/* NFT Properties */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='bg-muted/20 rounded p-3 text-center'>
                <div className='text-xs text-muted-foreground mb-1'>Symbol</div>
                <div className='font-semibold'>WOJAK</div>
              </div>
              <div className='bg-muted/20 rounded p-3 text-center'>
                <div className='text-xs text-muted-foreground mb-1'>Royalty</div>
                <div className='font-semibold'>5%</div>
              </div>
              <div className='bg-muted/20 rounded p-3 text-center'>
                <div className='text-xs text-muted-foreground mb-1'>Standard</div>
                <div className='font-semibold'>Metaplex</div>
              </div>
              <div className='bg-muted/20 rounded p-3 text-center'>
                <div className='text-xs text-muted-foreground mb-1'>Mutable</div>
                <div className='font-semibold'>Yes</div>
              </div>
            </div>

            {/* Created Date */}
            <div>
              <label className='text-sm font-medium text-muted-foreground mb-1 block'>
                Created
              </label>
              <div className='flex items-center gap-2 text-sm'>
                <Calendar className='w-4 h-4 text-muted-foreground' />
                <span>{new Date(character.createdAt).toLocaleDateString()}</span>
                <span className='text-muted-foreground'>
                  ({new Date(character.createdAt).toLocaleTimeString()})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Equipped Items */}
      {character.inventory.filter(item => item.isEquipped).length > 0 && (
        <div className='bg-card border rounded-lg p-6'>
          <div className='flex items-center gap-2 mb-4'>
            <Package className='w-5 h-5 text-blue-600' />
            <h3 className='text-lg font-semibold'>Equipped Items</h3>
          </div>

          <div className='space-y-2'>
            {character.inventory
              .filter(item => item.isEquipped)
              .map((item) => (
                <div
                  key={item.id}
                  className='flex items-center justify-between bg-muted/30 rounded-lg p-3 border'
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center'>
                      <Package className='w-4 h-4 text-primary' />
                    </div>
                    <div>
                      <div className='font-medium'>{item.item.name}</div>
                      <div className='text-xs text-muted-foreground capitalize'>
                        {item.item.category.toLowerCase()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Qty: {item.quantity}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Burn Character Section */}
      <BurnCharacter character={character} onCharacterCreated={onCharacterUpdated} />
    </div>
  )

  const renderWalletInfo = () => (
    <div className='space-y-4'>
      {/* Wallet Overview */}
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
            <Badge variant="outline" className="text-xs">
              {isDevnet ? 'Devnet' : 'Mainnet'}
            </Badge>
          </div>
        </div>

        {walletInfo.connected ? (
          <div className='space-y-4'>
            {/* Wallet Name */}
            <div>
              <label className='text-sm font-medium text-muted-foreground mb-1 block'>
                Wallet Provider
              </label>
              <div className='font-semibold text-lg'>{walletInfo.walletName}</div>
            </div>

            {/* Wallet Address */}
            <div>
              <label className='text-sm font-medium text-muted-foreground mb-1 block'>
                Wallet Address
              </label>
              <div className='flex items-center gap-2'>
                <code className='text-sm font-mono bg-muted px-3 py-2 rounded flex-1 break-all'>
                  {walletInfo.fullAddress}
                </code>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => copyToClipboard(walletInfo.fullAddress!, 'Wallet address')}
                >
                  <Copy className='w-4 h-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => openInExplorer(walletInfo.fullAddress!)}
                >
                  <ExternalLink className='w-4 h-4' />
                </Button>
              </div>
            </div>

            {/* Balance Display */}
            <div className='bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-4 border'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-sm font-medium text-muted-foreground'>SOL Balance</span>
                <Badge variant="secondary" className="text-xs">
                  {isDevnet ? 'Devnet' : 'Mainnet'}
                </Badge>
              </div>
              <div className='text-3xl font-bold font-mono text-purple-700 dark:text-purple-300'>
                {walletInfo.loading ? (
                  <span className='text-muted-foreground text-lg'>Loading...</span>
                ) : (
                  <span>{walletInfo.balance?.toFixed(4) || '0.0000'} SOL</span>
                )}
              </div>
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
    </div>
  )

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile
        </h3>
      </div>

      {/* Tabbed Navigation */}
      <Tabs defaultValue="character" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="character" className="text-sm">
            <User className="w-4 h-4 mr-2" />
            Character
          </TabsTrigger>
          <TabsTrigger value="wallet" className="text-sm">
            <Wallet className="w-4 h-4 mr-2" />
            Wallet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="character" className="mt-4">
          {renderCharacterProfile()}
        </TabsContent>

        <TabsContent value="wallet" className="mt-4">
          {renderWalletInfo()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
