// src/components/BottomDrawerNav.tsx - Terminal Style Navigation with Tabs
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from '@/components/ui/drawer'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { TransitionAvatar } from '@/components/TransitionAvatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ThemeModeToggle } from '@/components/ThemeModeToggle'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import {
  Map,
  TrendingUp,
  Backpack,
  MapPin,
  Shield,
  User,
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
  Star,
  Settings,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
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
  onearthMarketClick?: () => void
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
  onearthMarketClick,
  onAdminClick,
  isAdmin = false
}: BottomDrawerNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [glitchFunction, setGlitchFunction] = useState<(() => void) | null>(null)
  const { publicKey, disconnect, wallet, connected } = useWallet()

  const handleImageError = () => setImageError(true)

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toBase58())
      toast.success('WALLET_ADDRESS_COPIED')
    }
  }

  const getCharacterimage_url = () => {
    if (!character) return '/earth.png'
    if (imageError || !character.current_image_url) return '/earth.png'
    return character.current_image_url
  }

  const handleNavigation = (action: () => void) => {
    setDrawerOpen(false)
    action()
  }

  // Build navigation items without explicit colors
  const navItems = [
    {
      id: 'home',
      icon: MapPin,
      label: 'CURRENT_LOCATION',
      action: onHomeClick,
      current: currentView === 'main',
    },
    {
      id: 'profile',
      icon: User,
      label: 'PROFILE',
      action: onProfileClick,
      current: currentView === 'profile',
    },
    {
      id: 'map',
      icon: Map,
      label: 'WORLD_MAP',
      action: onMapClick,
      current: currentView === 'map',
    },
    {
      id: 'inventory',
      icon: Backpack,
      label: 'INVENTORY',
      action: onInventoryClick,
      current: currentView === 'inventory',
      badge: character?.inventory?.length,
    },
    {
      id: 'characters',
      icon: Users,
      label: 'PLAYERS',
      action: onCharactersClick,
      current: currentView === 'characters',
    },
    {
      id: 'leaderboards',
      icon: TrendingUp,
      label: 'RANKINGS',
      action: onLeaderboardsClick,
      current: currentView === 'leaderboards',
    },
    {
      id: 'earth-market',
      icon: BarChart3,
      label: 'EXCHANGE',
      action: onearthMarketClick,
      current: currentView === 'earth-market',
    },
    {
      id: 'economy',
      icon: TrendingUp,
      label: 'ECONOMY',
      action: onEconomyClick,
      current: currentView === 'economy',
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
    })
  }

  if (!character) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-background backdrop-blur border-b border-primary/30 font-mono">
        <div className="flex items-center justify-between p-4">
          {/* Terminal Header - No Character */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted/50 border border-primary/20 rounded-full flex items-center justify-center">
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
            <ThemeModeToggle />
            <WalletConnectButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Terminal Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background backdrop-blur border-b border-primary/30 font-mono">
        {/* Desktop: Stacked Layout */}
        <div className="hidden md:block">
          {/* Top Row: Character Info with Stats and Settings */}
          <div className="flex items-center justify-between p-3 border-b border-primary/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <TransitionAvatar
                  src={getCharacterimage_url()}
                  alt={character.name}
                  fallback={character.name.charAt(0).toUpperCase()}
                  className="w-16 h-16 rounded-sm border border-primary/20"
                  onInstantGlitch={setGlitchFunction}
                />
                <div className="min-w-0 flex-1">
                  <div className="gap-1 text-xs bg-success/10 p-1 mr-2 rounded float-left">
                    <Activity className="w-3 h-3 animate-pulse text-success" />
                  </div>
                  <div className="font-bold text-sm text-primary font-mono">{character.name.toUpperCase()}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono mb-1">
                    <MapPin className="w-3 h-3" />
                    {character.currentLocation?.name?.toUpperCase() || "UNKNOWN_ZONE"}
                  </div>
                  {/* Desktop Stats Row - Same as Mobile */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-0.5">
                      <Coins className="w-2.5 h-2.5 text-yellow-500" />
                      <span className="text-primary font-mono">{character.earth || 0}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 text-yellow-500" />
                      <span className="text-primary font-mono">{character.energy || 0}%</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5 text-error" />
                      <span className="text-primary font-mono">{character.health || 0}%</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-blue-500" />
                      <span className="text-primary font-mono">L{character.level || 1}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right: Theme Toggle and Wallet */}
            <div className="flex items-center gap-2">
              <ThemeModeToggle />
              <WalletConnectButton />
            </div>
          </div>

          {/* Bottom Row: Navigation */}
          <div className="flex items-center justify-center p-2">
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const IconComponent = item.icon
                const isAdmin = item.id === 'admin'

                if (!item.action) return null

                return (
                  <Button
                    key={item.id}
                    size="sm"
                    variant={item.current ? "outline" : "ghost"}  // Change "default" to "outline"
                    onClick={item.action}
                    className={`h-8 px-3 font-mono text-xs ${isAdmin
                      ? item.current
                        ? 'border-destructive text-destructive hover:bg-destructive/10'  // Remove bg-destructive
                        : 'text-destructive hover:text-destructive hover:bg-destructive/10'
                      : item.current
                        ? 'border-primary text-primary'  // Add styling for selected state
                        : ''
                      }`}
                    title={item.label}
                  >
                    <IconComponent className="w-4 h-4 mr-1" />
                    <span className="hidden lg:inline">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs font-mono">{item.badge}</Badge>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile: Grid Layout */}
        <div className="md:hidden p-3">
          {/* 3 Column Grid */}
          <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
            {/* Column 1: Avatar */}
            <TransitionAvatar
              src={getCharacterimage_url()}
              alt={character.name}
              fallback={character.name.charAt(0).toUpperCase()}
              className="w-14 h-14 rounded-sm border border-primary/20"
              onInstantGlitch={setGlitchFunction}
            />

            {/* Column 2: Character Info */}
            <div className="min-w-0">
              <div className="gap-1 text-xs bg-success/10 p-1 mr-2 rounded float-left">
                <Activity className="w-3 h-3 animate-pulse text-success" />
              </div>
              <div className="font-bold text-sm truncate text-primary font-mono">{character.name.toUpperCase()}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono mb-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{character.currentLocation?.name?.toUpperCase() || "UNKNOWN"}</span>
              </div>
              {/* Mobile Stats Row */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-0.5">
                  <Coins className="w-2.5 h-2.5 text-yellow-500" />
                  <span className="text-primary font-mono">{character.earth || 0}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 text-yellow-500" />
                  <span className="text-primary font-mono">{character.energy || 0}%</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5 text-error" />
                  <span className="text-primary font-mono">{character.health || 0}%</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 text-blue-500" />
                  <span className="text-primary font-mono">L{character.level || 1}</span>
                </div>
              </div>
            </div>

            {/* Column 3: Terminal Menu */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button size="sm" variant="outline" className="h-12 w-12 px-3 font-mono border-primary/30 dark:border-primary rounded-full">
                  <Terminal className="w-4 h-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-[80vh] bg-background border-t border-primary/30 font-mono">
                <VisuallyHidden>
                  <DrawerTitle>Mobile Navigation Interface</DrawerTitle>
                  <DrawerDescription>Main navigation panel for mobile devices with character stats, wallet info, and navigation options</DrawerDescription>
                </VisuallyHidden>
                {/* Terminal Drawer Header */}
                <DrawerHeader className="pb-3 border-b border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" />
                      <span className="text-primary font-bold font-mono">
                        <span className="sm:hidden">MOBILE_INTERFACE v2.089</span>
                        <span className="hidden sm:inline">TABLET_INTERFACE v2.089</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3 animate-pulse text-success" />
                      <span className="text-success text-xs font-mono">ACTIVE</span>
                      <ThemeModeToggle />
                    </div>
                  </div>
                </DrawerHeader>

                {/* Tabbed Interface */}
                <div className="flex-1 overflow-hidden">
                  <Tabs defaultValue="navigation" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 m-4 mb-2 bg-muted/30 border border-primary/20">
                      <TabsTrigger value="navigation" className="font-mono text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                        <Terminal className="w-3 h-3 mr-2" />
                        NAVIGATION
                      </TabsTrigger>
                      <TabsTrigger value="wallet" className="font-mono text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                        <Settings className="w-3 h-3 mr-2" />
                        SETTINGS
                      </TabsTrigger>
                    </TabsList>

                    {/* Navigation Tab */}
                    <TabsContent value="navigation" className="flex-1 overflow-y-auto px-4 pb-6 mt-0">
                      <div className="bg-muted/30 border border-primary/20 rounded p-3">
                        <div className="flex items-center gap-2 mb-3 border-b border-primary/20 pb-2">
                          <Terminal className="w-4 h-4 text-primary" />
                          <span className="text-primary font-bold text-sm font-mono">NAVIGATION_MENU</span>
                        </div>

                        {/* 2/3 Column Grid for Navigation */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {navItems.map((item) => {
                            const IconComponent = item.icon
                            const isAdmin = item.id === 'admin'

                            if (!item.action) return null

                            return (
                              <Button
                                key={item.id}
                                className={`flex-col h-16 p-2 font-mono text-xs ${isAdmin
                                  ? item.current
                                    ? 'border-destructive text-destructive hover:bg-destructive/10'
                                    : 'text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20'
                                  : item.current
                                    ? 'border-primary text-primary'
                                    : ''
                                  }`}
                                variant={item.current ? "outline" : "outline"}
                                onClick={() => handleNavigation(item.action)}
                              >
                                <IconComponent className="w-4 h-4 mb-1" />
                                <span className="font-mono text-xs leading-tight text-center">{item.label.split('_').join('\n')}</span>
                                {item.badge && (
                                  <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 px-1 text-xs font-mono">
                                    {item.badge}
                                  </Badge>
                                )}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    </TabsContent>

                    {/* Interface/Wallet Tab */}
                    <TabsContent value="wallet" className="flex-1 overflow-y-auto px-4 pb-6 mt-0">
                      {/* Wallet Terminal */}
                      {connected && publicKey && wallet ? (
                        <div className="bg-muted/30 border border-primary/20 rounded p-3">
                          <div className="flex items-center gap-2 mb-3 border-b border-primary/20 pb-2">
                            <Wallet className="w-4 h-4 text-primary" />
                            <span className="text-primary font-bold text-sm font-mono">WALLET_INTERFACE</span>
                          </div>

                          <div className="flex items-center gap-3 mb-3">
                            <TransitionAvatar
                              src={getCharacterimage_url()}
                              alt={character.name}
                              fallback={character.name.charAt(0).toUpperCase()}
                              className="w-10 h-10 border border-primary/20"
                              onInstantGlitch={setGlitchFunction}
                            />
                            <div className="flex-1">
                              <div className="gap-1 text-xs bg-success/10 p-1 mr-2 rounded float-left">
                                <Activity className="w-3 h-3 animate-pulse text-success" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary font-mono">{character.name.toUpperCase()}</span>
                                <Badge variant="secondary" className="text-xs font-mono">PLAYER</Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
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
                              variant="destructive"
                              size="sm"
                              className="font-mono text-xs"
                              onClick={disconnect}
                            >
                              <LogOut className="w-3 h-3 mr-2" />
                              DISCONNECT
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-muted/30 border border-primary/20 rounded p-3">
                          <div className="flex items-center gap-2 mb-3 border-b border-primary/20 pb-2">
                            <Wallet className="w-4 h-4 text-primary" />
                            <span className="text-primary font-bold text-sm font-mono">WALLET_INTERFACE</span>
                          </div>

                          <div className="flex items-center gap-3 mb-3">
                            <TransitionAvatar
                              src={getCharacterimage_url()}
                              alt={character.name}
                              fallback={character.name.charAt(0).toUpperCase()}
                              className="w-10 h-10 border border-primary/20"
                              onInstantGlitch={setGlitchFunction}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-primary font-mono">{character.name.toUpperCase()}</span>
                                <Badge variant="secondary" className="text-xs font-mono">PLAYER</Badge>
                              </div>
                            </div>
                          </div>

                          <div className="text-muted-foreground font-mono text-center">
                            <div className="text-sm mb-1">WALLET_INTERFACE_OFFLINE</div>
                            <div className="text-xs mb-3">CONNECTION_REQUIRED</div>
                          </div>
                          <WalletConnectButton />
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>

      {/* Terminal Spacer - Adjusted for new height */}
      <div className="h-16 md:h-24" />
    </>
  )
}
