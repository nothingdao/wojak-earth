// src/components/global-navbar.tsx - Updated with better responsive design
import { Button } from '@/components/ui/button'
import { Map, Backpack, MapPin, BoxIcon, Menu, Shield } from 'lucide-react'
import { ModeToggle } from './mode-toggle'
import type { Character } from '@/types'
import { WalletConnectButton } from './wallet-connect-button'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface GlobalNavbarProps {
  character: Character | null
  currentLocation?: string
  onProfileClick?: () => void
  onHomeClick?: () => void
  onMapClick?: () => void
  onSandboxClick?: () => void
  onInventoryClick?: () => void
  onAdminClick?: () => void
  networkSwitcher?: React.ReactNode
}

export function GlobalNavbar({
  character,
  currentLocation = "Earth",
  onProfileClick,
  onHomeClick,
  onMapClick,
  onSandboxClick,
  onInventoryClick,
  onAdminClick
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
      <div className="flex h-16 sm:h-14 items-center justify-between px-3 sm:px-4 lg:px-6 w-full">
        {/* Left: Character Image + Location Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {character && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 sm:h-9 sm:w-9 p-0 overflow-hidden"
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
          )}

          <Button
            variant="outline"
            size="sm"
            className="text-sm font-thin p-0 flex items-center h-10 sm:h-9"
            onClick={onHomeClick}
          >
            <div className="px-3 py-2 sm:px-2 sm:py-1">
              <MapPin className="w-4 h-4 sm:w-4 sm:h-4" />
            </div>
            <div className="w-px h-full bg-border" />
            <div className="px-3 py-2 sm:px-2 sm:py-1">
              <span className="hidden sm:inline text-sm">
                {currentLocation.length > 12 ? currentLocation.slice(0, 12) + '...' : currentLocation}
              </span>
              <span className="sm:hidden text-sm">
                {currentLocation.length > 8 ? currentLocation.slice(0, 8) + '...' : currentLocation}
              </span>
            </div>
          </Button>
        </div>

        {/* Center: Action Buttons (Desktop/Tablet only) */}
        <div className="hidden lg:flex items-center justify-center flex-1">
          {character && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4"
                onClick={onSandboxClick}
              >
                <BoxIcon className="w-4 h-4 mr-2" />
                <span className="text-sm">Sandbox</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4"
                onClick={onMapClick}
              >
                <Map className="w-4 h-4 mr-2" />
                <span className="text-sm">Map</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4"
                onClick={onInventoryClick}
              >
                <Backpack className="w-4 h-4 mr-2" />
                <span className="text-sm">Inventory</span>
              </Button>

              {/* Desktop Admin Button - only show if onAdminClick is provided */}
              {onAdminClick && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  onClick={onAdminClick}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="text-sm">Admin</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right: Theme Toggle + Wallet + Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <ModeToggle />
            <WalletConnectButton />
          </div>

          {/* Mobile/Tablet Hamburger Menu */}
          {character && (
            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 w-10 sm:h-9 sm:w-9 p-0">
                    <Menu className="w-5 h-5 sm:w-4 sm:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={onSandboxClick} className="py-3">
                    <BoxIcon className="w-5 h-5 mr-3" />
                    <span className="text-base">Sandbox</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onMapClick} className="py-3">
                    <Map className="w-5 h-5 mr-3" />
                    <span className="text-base">Map</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onInventoryClick} className="py-3">
                    <Backpack className="w-5 h-5 mr-3" />
                    <span className="text-base">Inventory</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onProfileClick} className="py-3">
                    <img
                      src={getCharacterImageUrl()}
                      alt={character.name}
                      className="w-5 h-5 mr-3 rounded object-cover"
                      onError={handleImageError}
                    />
                    <span className="text-base">Profile</span>
                  </DropdownMenuItem>

                  {/* Mobile Admin Menu Item - only show if onAdminClick is provided */}
                  {onAdminClick && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onAdminClick}
                        className="text-red-500 focus:text-red-400 focus:bg-red-500/10 py-3"
                      >
                        <Shield className="w-5 h-5 mr-3" />
                        <span className="text-base">Admin Panel</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
