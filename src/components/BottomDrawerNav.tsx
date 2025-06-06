// src/components/BottomDrawerNav.tsx - COMPLETELY REWRITTEN
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ModeToggle } from './mode-toggle'
import { WalletConnectButton } from './wallet-connect-button'
import {
  Menu,
  Map,
  Backpack,
  MapPin,
  Box,
  Shield,
  User,
  ChevronRight,
  Home,
  Coins,
  Zap,
  Heart,
  Sun,
  Wallet
} from 'lucide-react'
import type { Character, GameView } from '@/types'

interface BottomDrawerNavProps {
  character: Character | null
  currentView: GameView
  onProfileClick: () => void
  onHomeClick: () => void
  onMapClick: () => void
  onSandboxClick: () => void
  onInventoryClick: () => void
  onAdminClick?: () => void
  isAdmin?: boolean
}

export function BottomDrawerNav({
  character,
  currentView,
  onProfileClick,
  onHomeClick,
  onMapClick,
  onSandboxClick,
  onInventoryClick,
  onAdminClick,
  isAdmin = false
}: BottomDrawerNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageError = () => setImageError(true)

  const getCharacterImageUrl = () => {
    if (!character) return '/wojak.png'
    if (imageError || !character.currentImageUrl) return '/wojak.png'
    return character.currentImageUrl
  }

  const handleNavigation = (action: () => void) => {
    setDrawerOpen(false)
    action()
  }

  // Build navigation items
  const navItems = [
    { id: 'home', icon: Home, label: 'Home Base', action: onHomeClick, current: currentView === 'main' },
    { id: 'map', icon: Map, label: 'World Map', action: onMapClick, current: currentView === 'map' },
    { id: 'inventory', icon: Backpack, label: 'Inventory', action: onInventoryClick, current: currentView === 'inventory', badge: character?.inventory?.length },
    { id: 'sandbox', icon: Box, label: 'Sandbox', action: onSandboxClick, current: currentView === 'sandbox' },
    { id: 'profile', icon: User, label: 'Profile', action: onProfileClick, current: currentView === 'profile' }
  ]

  // Add admin if applicable
  if (isAdmin && onAdminClick) {
    navItems.push({
      id: 'admin',
      icon: Shield,
      label: 'Admin Panel',
      action: onAdminClick,
      current: currentView === 'admin'
    })
  }

  if (!character) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src="/wojak.png" />
              <AvatarFallback>W</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm">Wojak Earth</div>
              <div className="text-xs text-muted-foreground">Connect to play</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <WalletConnectButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Top Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarImage
                src={getCharacterImageUrl()}
                alt={character.name}
                onError={handleImageError}
                onLoad={() => setImageError(false)}
              />
              <AvatarFallback>{character.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{character.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{character.currentLocation?.name || "Unknown"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className="font-medium">{character.coins || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{character.energy || 0}%</span>
              </div>
            </div>

            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 px-3">
                  <Menu className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Menu</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-[80vh]">
                {/* Header */}
                <DrawerHeader className="flex-shrink-0 pb-4">
                  <DrawerTitle className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={getCharacterImageUrl()} alt={character.name} onError={handleImageError} />
                      <AvatarFallback>{character.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-lg">{character.name}</div>
                      <Badge variant="secondary">Level {character.level || 1}</Badge>
                    </div>
                  </DrawerTitle>
                </DrawerHeader>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  {/* Stats */}
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <Coins className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
                        <div className="font-semibold">{character.coins || 0}</div>
                        <div className="text-xs text-muted-foreground">Coins</div>
                      </div>
                      <div>
                        <Zap className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                        <div className="font-semibold">{character.energy || 0}%</div>
                        <div className="text-xs text-muted-foreground">Energy</div>
                      </div>
                      <div>
                        <Heart className="w-5 h-5 mx-auto text-red-600 mb-1" />
                        <div className="font-semibold">{character.health || 0}%</div>
                        <div className="text-xs text-muted-foreground">Health</div>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      <MapPin className="w-4 h-4 text-primary" />
                      Current Location
                    </div>
                    <div className="font-semibold">{character.currentLocation?.name || "Unknown Location"}</div>
                  </div>

                  {/* Navigation */}
                  <div className="mb-4">
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">NAVIGATION</h4>
                    <div className="space-y-1">
                      {navItems.map((item) => {
                        const IconComponent = item.icon
                        const isAdmin = item.id === 'admin'

                        return (
                          <Button
                            key={item.id}
                            className={`w-full justify-start h-11 ${item.current ? (isAdmin ? 'bg-red-50 dark:bg-red-950/20' : 'bg-primary/10') : ''
                              } ${isAdmin ? 'text-red-600' : ''}`}
                            variant={item.current ? "outline" : "ghost"}
                            onClick={() => handleNavigation(item.action)}
                          >
                            <IconComponent className="w-5 h-5 mr-3" />
                            <span className="font-medium">{item.label}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="ml-auto mr-2">{item.badge}</Badge>
                            )}
                            <ChevronRight className="w-4 h-4 ml-auto" />
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Settings */}
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">SETTINGS</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Sun className="w-5 h-5" />
                          <span className="font-medium">Theme</span>
                        </div>
                        <ModeToggle />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Wallet className="w-5 h-5" />
                          <span className="font-medium">Wallet</span>
                        </div>
                        <WalletConnectButton />
                      </div>
                    </div>
                  </div>

                  {/* Debug */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 text-xs text-muted-foreground p-2 bg-muted/20 rounded">
                      Debug: Admin={String(isAdmin)} | Nav={navItems.map(i => i.id).join(',')}
                    </div>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="h-16" />
    </>
  )
}
