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
  Layers,
  Database,
  Activity,
  Signal,
  MapPin
} from 'lucide-react'
import { useWalletInfo } from '@/hooks/useWalletInfo'
import { toast } from 'sonner'
import type { Character } from '@/types'
import { BurnCharacter } from '../BurnCharacter'
import { useNetwork } from '@/contexts/NetworkContext'
import SparkleParticles from "@/components/SparkleParticles"; // adjust path as needed

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-500 dark:text-green-400'
      case 'DEAD': return 'text-red-500 dark:text-red-400'
      case 'PENDING_MINT': return 'text-yellow-500 dark:text-yellow-400'
      default: return 'text-muted-foreground'
    }
  }

  const renderCharacterProfile = () => (
    <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">SURVIVOR DOSSIER v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Signal className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">CLASSIFIED</span>
        </div>
      </div>

      {/* Character Header Section */}
      <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          {/* Character Image */}
          <div className="mx-auto md:mx-0">
            <div className="w-48 h-48 bg-muted/50 border border-primary/20 rounded flex items-center justify-center overflow-hidden relative">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <Activity className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {!imageError ? (
                // <img
                //   src={getCharacterImageUrl()}
                //   alt={character.name}
                //   className="w-full h-full object-cover"
                //   onLoad={handleImageLoad}
                //   onError={handleImageError}
                //   style={{ display: imageLoading ? 'none' : 'block' }}
                // />
                // <img
                //   src="eve.png"
                //   alt={character.name}
                //   className="w-full h-full object-cover"
                //   onLoad={handleImageLoad}
                //   onError={handleImageError}
                //   style={{ display: imageLoading ? 'none' : 'block' }}
                // />
                <div className="relative w-full h-full">
                  <SparkleParticles />

                  <img
                    src="eve.png"
                    alt={character.name}
                    className="w-full h-full object-contain relative z-10"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{ display: imageLoading ? 'none' : 'block' }}
                  />
                </div>
              ) : (
                <div className="text-4xl text-muted-foreground">🥺</div>
              )}
            </div>
          </div>

          {/* Character Info */}
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-muted-foreground mb-1">DESIGNATION</div>
                <div className="text-primary font-bold text-lg">{character.name.toUpperCase()}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">CLEARANCE_LVL</div>
                <div className="text-primary font-bold text-lg flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  {character.level}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">PHENOTYPE</div>
                <div className="text-primary font-bold">{character.gender}_{character.characterType}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">STATUS</div>
                <div className={`font-bold ${getStatusColor(character.status || 'ACTIVE')}`}>
                  {(character.status || 'ACTIVE').toUpperCase()}
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                <Hash className="w-3 h-3 mr-1" />
                VER_{character.currentVersion}
              </Badge>
              {isDevnet && (
                <Badge variant="secondary" className="text-xs font-mono bg-orange-500/20 text-orange-600">
                  <Globe className="w-3 h-3 mr-1" />
                  DEVNET_NODE
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-mono">
                <Shield className="w-3 h-3 mr-1" />
                AUTHORIZED
              </Badge>
            </div>

            {/* Subject ID */}
            <div className="bg-muted/20 border border-primary/10 rounded p-2">
              <div className="text-muted-foreground text-xs mb-1">SUBJECT_ID</div>
              <div className="text-xs font-mono text-primary break-all">{character.id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vital Statistics */}
      <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
        <div className="text-muted-foreground text-xs mb-3">VITAL_STATISTICS</div>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">ENERGY</span>
            </div>
            <div className="text-primary font-bold text-lg font-mono">
              {character.energy}/100
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 mt-1">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${character.energy}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">HEALTH</span>
            </div>
            <div className="text-primary font-bold text-lg font-mono">
              {character.health}/100
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 mt-1">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${character.health}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">RUST</span>
            </div>
            <div className="text-primary font-bold text-lg font-mono">
              {character.coins.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">RUST_COIN</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">INVENTORY</span>
            </div>
            <div className="text-primary font-bold text-lg font-mono">
              {character.inventory.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">ITEMS</div>
          </div>
        </div>
      </div>

      {/* Current Location */}
      <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
        <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          CURRENT_COORDINATES
        </div>
        <div className="text-primary font-bold text-lg font-mono mb-2">
          {character.currentLocation.name.toUpperCase()}
        </div>
        <div className="text-xs text-muted-foreground">
          {character.currentLocation.description}
        </div>
      </div>

      {/* NFT Metadata Section */}
      {character.nftAddress && (
        <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
          <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            BLOCKCHAIN_METADATA
          </div>

          <div className="space-y-3">
            {/* NFT Address */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">NFT_ADDRESS</div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono bg-muted/50 border border-primary/10 px-2 py-1 rounded flex-1 break-all text-primary">
                  {character.nftAddress}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(character.nftAddress!, 'NFT address')}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openInExplorer(character.nftAddress!)}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Metadata URI */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">METADATA_URI</div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono bg-muted/50 border border-primary/10 px-2 py-1 rounded flex-1 break-all text-primary">
                  https://earth.ndao.computer/.netlify/functions/metadata/{character.id}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(
                    `https://earth.ndao.computer/.netlify/functions/metadata/${character.id}`,
                    'Metadata URI'
                  )}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(
                    `https://earth.ndao.computer/.netlify/functions/metadata/${character.id}`,
                    '_blank'
                  )}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Collection Info */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">SYMBOL</div>
                <div className="text-primary font-bold font-mono">WOJAK</div>
              </div>
              <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">ROYALTY</div>
                <div className="text-primary font-bold font-mono">5%</div>
              </div>
              <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">STANDARD</div>
                <div className="text-primary font-bold font-mono">METAPLEX</div>
              </div>
              <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">MUTABLE</div>
                <div className="text-green-500 font-bold font-mono">TRUE</div>
              </div>
            </div>

            {/* Created Date */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">GENESIS_TIMESTAMP</div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-primary">{new Date(character.createdAt).toLocaleDateString()}</span>
                <span className="text-muted-foreground">
                  {new Date(character.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Equipped Items */}
      {character.inventory.filter(item => item.isEquipped).length > 0 && (
        <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
          <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
            ACTIVE_EQUIPMENT_LOADOUT
          </div>

          <div className="space-y-2">
            {character.inventory
              .filter(item => item.isEquipped)
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-muted/20 border border-primary/10 rounded p-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/20 border border-primary/20 rounded flex items-center justify-center">
                      <Package className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <div className="text-primary font-bold text-xs font-mono">{item.item.name.toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {item.item.category}_{item.item.rarity}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.is_primary && (
                      <Badge variant="default" className="text-xs bg-yellow-500 font-mono">
                        PRIMARY
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs font-mono">
                      QTY_{item.quantity}
                    </Badge>
                  </div>
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
    <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span className="text-primary font-bold">WALLET INTERFACE v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          {walletInfo.connected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={walletInfo.refreshBalance}
              disabled={walletInfo.loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw
                className={`w-3 h-3 ${walletInfo.loading ? 'animate-spin' : ''}`}
              />
            </Button>
          )}
          <Badge variant="outline" className="text-xs font-mono">
            {isDevnet ? 'DEVNET' : 'MAINNET'}
          </Badge>
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">{walletInfo.connected ? 'LINKED' : 'OFFLINE'}</span>
        </div>
      </div>

      {walletInfo.connected ? (
        <div className="space-y-4">
          {/* Wallet Provider */}
          <div className="bg-muted/30 border border-primary/20 rounded p-3">
            <div className="text-muted-foreground text-xs mb-1">WALLET_PROVIDER</div>
            <div className="text-primary font-bold font-mono">{walletInfo.walletName?.toUpperCase()}</div>
          </div>

          {/* Wallet Address */}
          <div className="bg-muted/30 border border-primary/20 rounded p-3">
            <div className="text-muted-foreground text-xs mb-2">WALLET_ADDRESS</div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono bg-muted/50 border border-primary/10 px-2 py-1 rounded flex-1 break-all text-primary">
                {walletInfo.fullAddress}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(walletInfo.fullAddress!, 'Wallet address')}
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openInExplorer(walletInfo.fullAddress!)}
                className="h-6 w-6 p-0"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Balance Display */}
          <div className="bg-muted/30 border border-primary/20 rounded p-4">
            <div className="text-muted-foreground text-xs mb-3 flex items-center justify-between">
              <span>SOL_BALANCE</span>
              <Badge variant="outline" className="text-xs font-mono">
                {isDevnet ? 'DEVNET' : 'MAINNET'}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-mono text-primary mb-2">
                {walletInfo.loading ? (
                  <span className="text-muted-foreground text-lg">SYNCING...</span>
                ) : (
                  <span>{walletInfo.balance?.toFixed(4) || '0.0000'}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-mono">SOL_TOKENS</div>
            </div>
          </div>

          {/* Network Status */}
          <div className="bg-muted/30 border border-primary/20 rounded p-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="text-center">
                <div className="text-muted-foreground mb-1">NETWORK_STATUS</div>
                <div className="text-green-500 font-bold font-mono">ONLINE</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground mb-1">CONNECTION</div>
                <div className="text-green-500 font-bold font-mono">SECURE</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <div className="text-muted-foreground font-mono mb-2">
            <div className="text-lg mb-2">NO_WALLET_DETECTED</div>
            <div className="text-sm">CONNECT_SOLANA_WALLET_TO_ACCESS</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 mt-4 flex justify-between text-xs text-muted-foreground/60">
        <span>WALLET_INTERFACE_v2089</span>
        <span>LAST_SYNC: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono text-primary">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span className="text-primary font-bold">PROFILE ACCESS TERMINAL v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">AUTHENTICATED</span>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <Tabs defaultValue="character" className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max h-10 p-1 bg-muted/50">
            <TabsTrigger value="character" className="text-xs font-mono flex-shrink-0 px-4">
              <User className="w-3 h-3 mr-2" />
              SURVIVOR_DOSSIER
            </TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs font-mono flex-shrink-0 px-4">
              <Wallet className="w-3 h-3 mr-2" />
              WALLET_INTERFACE
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="character" className="mt-4">
          {renderCharacterProfile()}
        </TabsContent>

        <TabsContent value="wallet" className="mt-4">
          {renderWalletInfo()}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 mt-4 flex justify-between text-xs text-muted-foreground/60">
        <span>PROFILE_ACCESS_TERMINAL_v2089</span>
        <span>SESSION_TIME: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
