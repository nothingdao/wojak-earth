// src/components/BottomDrawerNav.tsx - Terminal Style Navigation
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTrigger } from '@/components/ui/drawer'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from './mode-toggle'
import { WalletConnectButton } from './wallet-connect-button'
import {
  Menu,
  Map,
  TrendingUp,
  Backpack,
  MapPin,
  Shield,
  User,
  ChevronRight,
  Home,
  Wallet,
  Users,
  Copy,
  LogOut,
  BarChart3,
  Activity,
  Signal,
  Database,
  Zap,
  Heart,
  Coins,
  Terminal,
  Hash,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import type { Character, GameView } from '@/types'

interface BottomDrawerNavProps {
  character: Character | null
  currentView: GameView
  onProfileClick: () => void
  onHomeClick: () => void
  onMapClick: () => void
  onInventoryClick: () => void
  onAdminClick?: () => void
  isAdmin?: boolean
  onCharactersClick?: () => void
  onEconomyClick?: () => void
  onLeaderboardsClick?: () => void
  onRustMarketClick?: () => void
}

export function BottomDrawerNav({
  character,
  currentView,
  onProfileClick,
  onHomeClick,
  onMapClick,
  onInventoryClick,
  onCharactersClick,
  onEconomyClick,
  onLeaderboardsClick,
  onRustMarketClick,
  onAdminClick,
  isAdmin = false
}: BottomDrawerNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { publicKey, disconnect, wallet, connected } = useWallet()

  const handleImageError = () => setImageError(true)

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58())
      toast.success('WALLET_ADDRESS_COPIED')
    }
  }

  const getCharacterimage_url = () => {
    if (!character) return '/wojak.png'
    if (imageError || !character.current_image_url) return '/wojak.png'
    return character.current_image_url
  }

  const handleNavigation = (action: () => void) => {
    setDrawerOpen(false)
    action()
  }

  // Build navigation items with terminal styling
  const navItems = [
    {
      id: 'home',
      icon: Home,
      label: 'HOME_BASE',
      action: onHomeClick,
      current: currentView === 'main',
      color: 'text-green-500'
    },
    {
      id: 'map',
      icon: Map,
      label: 'WORLD_MAP',
      action: onMapClick,
      current: currentView === 'map',
      color: 'text-blue-500'
    },
    {
      id: 'inventory',
      icon: Backpack,
      label: 'INVENTORY',
      action: onInventoryClick,
      current: currentView === 'inventory',
      badge: character?.inventory?.length,
      color: 'text-purple-500'
    },
    {
      id: 'characters',
      icon: Users,
      label: 'SPECIMENS',
      action: onCharactersClick,
      current: currentView === 'characters',
      color: 'text-orange-500'
    },
    {
      id: 'leaderboards',
      icon: TrendingUp,
      label: 'RANKINGS',
      action: onLeaderboardsClick,
      current: currentView === 'leaderboards',
      color: 'text-yellow-500'
    },
    {
      id: 'rust-market',
      icon: BarChart3,
      label: 'EXCHANGE',
      action: onRustMarketClick,
      current: currentView === 'rust-market',
      color: 'text-cyan-500'
    },
    {
      id: 'profile',
      icon: User,
      label: 'PROFILE',
      action: onProfileClick,
      current: currentView === 'profile',
      color: 'text-pink-500'
    },
    {
      id: 'economy',
      icon: TrendingUp,
      label: 'ECONOMY',
      action: onEconomyClick,
      current: currentView === 'economy',
      color: 'text-emerald-500'
    }
  ]

  // Add admin if applicable
  if (isAdmin && onAdminClick) {
    navItems.push({
      id: 'admin',
      icon: Shield,
      label: 'ADMIN_PANEL',
      action: onAdminClick,
      current: currentView === 'admin',
      color: 'text-red-500'
    })
  }

  if (!character) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-primary/30 font-mono">
        <div className="flex items-center justify-between p-4">
          {/* Terminal Header - No Character */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted/50 border border-primary/20 rounded flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-bold text-sm text-primary font-mono">EARTH.NDAO.COMPUTER</div>
              <div className="text-xs text-muted-foreground font-mono">CONNECTION_REQUIRED</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              <Signal className="w-3 h-3 mr-1" />
              OFFLINE
            </Badge>
            <ModeToggle />
            <WalletConnectButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Terminal Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b border-primary/30 font-mono">
        <div className="flex items-center justify-between p-3">
          {/* Desktop: Terminal Status Display */}
          <div className="hidden md:flex items-center gap-4 flex-1">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-primary/20">
                <AvatarImage
                  src={getCharacterimage_url()}
                  alt={character.name}
                  onError={handleImageError}
                  onLoad={() => setImageError(false)}
                />
                <AvatarFallback className="bg-muted/50 font-mono text-xs">
                  {character.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-sm text-primary font-mono">{character.name.toUpperCase()}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                  <MapPin className="w-3 h-3" />
                  {character.currentLocation?.name?.toUpperCase() || "UNKNOWN_ZONE"}
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-500" />
                <span className="text-primary font-mono">{character.energy || 0}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-red-500" />
                <span className="text-primary font-mono">{character.health || 0}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Coins className="w-3 h-3 text-yellow-500" />
                <span className="text-primary font-mono">{character.coins || 0}</span>
              </div>
            </div>
          </div>

          {/* Mobile: Character Status */}
          <div className="flex md:hidden items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-10 h-10 flex-shrink-0 border border-primary/20">
              <AvatarImage
                src={getCharacterimage_url()}
                alt={character.name}
                onError={handleImageError}
                onLoad={() => setImageError(false)}
              />
              <AvatarFallback className="bg-muted/50 font-mono text-xs">
                {character.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate text-primary font-mono">{character.name.toUpperCase()}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{character.currentLocation?.name?.toUpperCase() || "UNKNOWN"}</span>
              </div>
            </div>
          </div>

          {/* Desktop: Terminal Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const IconComponent = item.icon
              const isAdmin = item.id === 'admin'

              if (!item.action) return null

              return (
                <Button
                  key={item.id}
                  size="sm"
                  variant={item.current ? "default" : "ghost"}
                  onClick={item.action}
                  className={`h-7 px-2 font-mono text-xs ${item.current
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'hover:bg-muted/50'
                    } ${isAdmin ? 'text-red-500 hover:text-red-400' : ''}`}
                  title={item.label}
                >
                  <IconComponent className={`w-3 h-3 ${item.current ? 'text-primary' : item.color}`} />
                  {item.badge && (
                    <Badge variant="secondary" className="ml-1 h-3 px-1 text-xs font-mono">{item.badge}</Badge>
                  )}
                </Button>
              )
            })}

            <Separator orientation="vertical" className="h-6 mx-2 border-primary/20" />

            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs font-mono h-7 px-2">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                ONLINE
              </Badge>
              <ModeToggle />
              <WalletConnectButton />
            </div>
          </div>

          {/* Mobile: Terminal Menu */}
          <div className="flex md:hidden items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono h-7 px-2">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              ACTIVE
            </Badge>
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button size="sm" variant="outline" className="h-10 px-3 font-mono border-primary/30">
                  <Terminal className="w-4 h-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-[75vh] bg-background border-t border-primary/30 font-mono">
                {/* Terminal Drawer Header */}
                <DrawerHeader className="pb-4 border-b border-primary/20">
                  <div className="space-y-4">
                    {/* System Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-primary" />
                        <span className="text-primary font-bold font-mono">MOBILE_INTERFACE v2.089</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 animate-pulse text-green-500" />
                        <span className="text-green-500 text-xs font-mono">ACTIVE</span>
                      </div>
                    </div>

                    {/* Character Status Panel */}
                    <div className="bg-muted/30 border border-primary/20 rounded p-3">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-12 h-12 border border-primary/20">
                          <AvatarImage src={getCharacterimage_url()} alt={character.name} onError={handleImageError} />
                          <AvatarFallback className="bg-muted/50 font-mono">
                            {character.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-bold text-primary font-mono">{character.name.toUpperCase()}</div>
                          <div className="text-xs text-muted-foreground font-mono">CLEARANCE_LVL_{character.level || 1}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                            <MapPin className="w-3 h-3" />
                            {character.currentLocation?.name?.toUpperCase() || "UNKNOWN_SECTOR"}
                          </div>
                        </div>
                        <ModeToggle />
                      </div>

                      {/* Vital Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Coins className="w-3 h-3 text-yellow-500" />
                            <span className="text-muted-foreground font-mono">RUST</span>
                          </div>
                          <div className="font-bold text-primary font-mono">{character.coins || 0}</div>
                        </div>
                        <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="text-muted-foreground font-mono">ENERGY</span>
                          </div>
                          <div className="font-bold text-primary font-mono">{character.energy || 0}%</div>
                        </div>
                        <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Heart className="w-3 h-3 text-red-500" />
                            <span className="text-muted-foreground font-mono">HEALTH</span>
                          </div>
                          <div className="font-bold text-primary font-mono">{character.health || 0}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Wallet Terminal */}
                    {connected && publicKey && wallet ? (
                      <div className="bg-muted/30 border border-primary/20 rounded p-3">
                        <div className="flex items-center gap-2 mb-3 border-b border-primary/20 pb-2">
                          <Wallet className="w-4 h-4 text-primary" />
                          <span className="text-primary font-bold text-sm font-mono">WALLET_INTERFACE</span>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="w-10 h-10 border border-primary/20">
                            <AvatarImage src={wallet.adapter.icon} alt={wallet.adapter.name} />
                            <AvatarFallback className="bg-muted/50">
                              <Wallet className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary font-mono">{wallet.adapter.name.toUpperCase()}</span>
                              <Badge variant="secondary" className="text-xs font-mono">LINKED</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="bg-muted/20 border border-primary/10 rounded p-2 mb-3">
                          <div className="text-xs text-muted-foreground mb-1 font-mono">WALLET_ADDRESS</div>
                          <div className="text-xs font-mono text-primary break-all">
                            {publicKey.toBase58()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={copyAddress} className="font-mono text-xs">
                            <Copy className="w-3 h-3 mr-2" />
                            COPY_ADDR
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-400 font-mono text-xs"
                            onClick={disconnect}
                          >
                            <LogOut className="w-3 h-3 mr-2" />
                            DISCONNECT
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/30 border border-primary/20 rounded p-4 text-center">
                        <div className="text-muted-foreground font-mono mb-3">
                          <div className="text-sm mb-1">WALLET_INTERFACE_OFFLINE</div>
                          <div className="text-xs">CONNECTION_REQUIRED</div>
                        </div>
                        <WalletConnectButton />
                      </div>
                    )}
                  </div>
                </DrawerHeader>

                {/* Terminal Navigation Menu */}
                <div className="flex-1 overflow-y-auto px-4 pb-6">
                  <div className="bg-muted/30 border border-primary/20 rounded p-3">
                    <div className="flex items-center gap-2 mb-3 border-b border-primary/20 pb-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span className="text-primary font-bold text-sm font-mono">NAVIGATION_MENU</span>
                    </div>

                    <div className="space-y-1">
                      {navItems.map((item) => {
                        const IconComponent = item.icon
                        const isAdmin = item.id === 'admin'

                        if (!item.action) return null

                        return (
                          <Button
                            key={item.id}
                            className={`w-full justify-start h-10 font-mono text-xs ${item.current
                              ? (isAdmin
                                ? 'bg-red-500/20 border-red-500/30 text-red-500'
                                : 'bg-primary/20 border-primary/30 text-primary'
                              )
                              : 'hover:bg-muted/50'
                              } ${isAdmin && !item.current ? 'text-red-500 hover:text-red-400' : ''}`}
                            variant={item.current ? "outline" : "ghost"}
                            onClick={() => handleNavigation(item.action)}
                          >
                            <IconComponent className={`w-4 h-4 mr-3 ${item.current ? (isAdmin ? 'text-red-500' : 'text-primary') : item.color
                              }`} />
                            <span className="font-mono">{item.label}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="ml-auto mr-2 font-mono text-xs">
                                {item.badge}
                              </Badge>
                            )}
                            <ChevronRight className="w-3 h-3 ml-auto" />
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>

      {/* Terminal Spacer */}
      <div className="h-16" />
    </>
  )
}
