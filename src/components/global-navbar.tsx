// src/components/global-navbar.tsx - Updated with admin button
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
  networkSwitcher?: React.ReactNode //
}

export function GlobalNavbar({
  character,
  currentLocation = "Earth",
  onProfileClick,
  onHomeClick,
  onMapClick,
  onSandboxClick,
  onInventoryClick,
  onAdminClick // Add this to the destructuring
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
        {/* Left: Character Image + Location Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {character && (
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
          )}

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

        {/* Center: Action Buttons (Desktop/Tablet only) */}
        <div className="hidden md:flex items-center justify-center flex-1">
          {character && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={onSandboxClick}
              >
                <BoxIcon className="w-4 h-4 mr-2" />
                Sandbox
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={onMapClick}
              >
                <Map className="w-4 h-4 mr-2" />
                Map
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={onInventoryClick}
              >
                <Backpack className="w-4 h-4 mr-2" />
                Inventory
              </Button>

              {/* Desktop Admin Button - only show if onAdminClick is provided */}
              {onAdminClick && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  onClick={onAdminClick}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Right: Theme Toggle + Wallet + Hamburger (mobile only) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <ModeToggle />
          <WalletConnectButton />

          {/* Mobile Hamburger Menu */}
          {character && (
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-2">
                    <Menu className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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

                  {/* Mobile Admin Menu Item - only show if onAdminClick is provided */}
                  {onAdminClick && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onAdminClick}
                        className="text-red-500 focus:text-red-400 focus:bg-red-500/10"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
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
