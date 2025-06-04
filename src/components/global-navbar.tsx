// src/components/global-navbar.tsx
import { Button } from '@/components/ui/button'
import { Zap, Heart, Map, Backpack, MapPin, BoxIcon, Menu } from 'lucide-react'
import { ModeToggle } from './mode-toggle'
import type { Character } from '@/types'
import { WalletConnectButton } from './wallet-connect-button'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface GlobalNavbarProps {
  character: Character | null
  currentLocation?: string
  onProfileClick?: () => void
  onHomeClick?: () => void
  onMapClick?: () => void
  onSandboxClick?: () => void
  onInventoryClick?: () => void
}

export function GlobalNavbar({
  character,
  currentLocation = "Earth",
  onProfileClick,
  onHomeClick,
  onMapClick,
  onSandboxClick,
  onInventoryClick
}: GlobalNavbarProps) {
  const [imageError, setImageError] = useState(false)

  // Handle image load error
  const handleImageError = () => {
    setImageError(true)
  }

  // Get character image URL with fallback
  const getCharacterImageUrl = () => {
    if (!character) return '/wojak.png'

    // If there's an error or no currentImageUrl, use fallback
    if (imageError || !character.currentImageUrl) {
      return '/wojak.png'
    }

    return character.currentImageUrl
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-2 sm:px-4 w-full">
        {/* Left: Game Title + Home Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-sm font-thin p-0 flex items-center"
            onClick={onHomeClick}
          >
            <div className="px-2 py-1">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="w-px h-full bg-border" />
            <div className="px-2 py-1">
              <span className="hidden sm:inline">{currentLocation}</span>
              <span className="sm:hidden">{currentLocation.length > 8 ? currentLocation.slice(0, 8) + '...' : currentLocation}</span>
            </div>
          </Button>
        </div>

        {/* Center: Character Stats + Actions */}
        <div className="flex items-center justify-center flex-1 px-2">
          {character && (
            <>
              {/* Desktop: Full layout */}
              <div className="hidden md:flex items-center gap-2">
                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={onSandboxClick}
                  >
                    <BoxIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={onMapClick}
                  >
                    <Map className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={onInventoryClick}
                  >
                    <Backpack className="w-4 h-4" />
                  </Button>
                </div>

                {/* Character Avatar */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 overflow-hidden"
                  onClick={onProfileClick}
                  aria-label={`${character.name} profile`}
                >
                  <img
                    src={getCharacterImageUrl()}
                    alt={character.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                    onLoad={() => setImageError(false)}
                  />
                </Button>

                {/* Stats */}
                <div className="flex items-center gap-3 text-sm ml-2">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span className="font-thin">{character.energy}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span className="font-thin">{character.health}</span>
                  </span>
                </div>
              </div>

              {/* Tablet: Compact layout */}
              <div className="hidden sm:flex md:hidden items-center gap-2">
                {/* Character Avatar */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 overflow-hidden"
                  onClick={onProfileClick}
                  aria-label={`${character.name} profile`}
                >
                  <img
                    src={getCharacterImageUrl()}
                    alt={character.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                    onLoad={() => setImageError(false)}
                  />
                </Button>

                {/* Stats */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span className="font-thin">{character.energy}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span className="font-thin">{character.health}</span>
                  </span>
                </div>

                {/* Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={onSandboxClick}>
                      <BoxIcon className="w-4 h-4 mr-2" />
                      Sandbox
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onMapClick}>
                      <Map className="w-4 h-4 mr-2" />
                      Map
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onInventoryClick}>
                      <Backpack className="w-4 h-4 mr-2" />
                      Inventory
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile: Most compact layout */}
              <div className="flex sm:hidden items-center gap-2">
                {/* Character Avatar */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 overflow-hidden"
                  onClick={onProfileClick}
                  aria-label={`${character.name} profile`}
                >
                  <img
                    src={getCharacterImageUrl()}
                    alt={character.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                    onLoad={() => setImageError(false)}
                  />
                </Button>

                {/* Compact Stats */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    <span className="font-thin">{character.energy}</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5" />
                    <span className="font-thin">{character.health}</span>
                  </span>
                </div>

                {/* Mobile Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-1.5">
                      <Menu className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    <DropdownMenuItem onClick={onSandboxClick}>
                      <BoxIcon className="w-4 h-4 mr-2" />
                      Sandbox
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onMapClick}>
                      <Map className="w-4 h-4 mr-2" />
                      Map
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onInventoryClick}>
                      <Backpack className="w-4 h-4 mr-2" />
                      Inventory
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onProfileClick}>
                      <img
                        src={getCharacterImageUrl()}
                        alt={character.name}
                        className="w-4 h-4 mr-2 rounded object-cover"
                        onError={handleImageError}
                      />
                      Profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>

        {/* Right: Wallet, Theme */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className="hidden sm:block">
            <WalletConnectButton />
          </div>
          <div className="sm:hidden">
            {/* Mobile wallet button - more compact */}
            <WalletConnectButton />
          </div>
          <ModeToggle />
        </div>
      </div>

      {/* Mobile bottom nav alternative (optional) */}
      {character && (
        <div className="sm:hidden border-t bg-background/95 backdrop-blur">
          <div className="flex items-center justify-around py-2 px-4">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={onSandboxClick}
            >
              <BoxIcon className="w-4 h-4" />
              <span className="text-xs">Sandbox</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={onMapClick}
            >
              <Map className="w-4 h-4" />
              <span className="text-xs">Map</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={onInventoryClick}
            >
              <Backpack className="w-4 h-4" />
              <span className="text-xs">Inventory</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={onProfileClick}
            >
              <img
                src={getCharacterImageUrl()}
                alt={character.name}
                className="w-4 h-4 rounded object-cover"
                onError={handleImageError}
              />
              <span className="text-xs">Profile</span>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
