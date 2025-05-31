import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Settings, Zap, Heart, Map, Backpack, Home, MapPin } from 'lucide-react'
import { ModeToggle } from './mode-toggle'
import type { Character } from '@/types'
import { WalletConnectButton } from './wallet-connect-button'

interface GlobalNavbarProps {
  character: Character | null
  onSettingsClick?: () => void
  onProfileClick?: () => void
  onHomeClick?: () => void
  onMapClick?: () => void
  onInventoryClick?: () => void
}

export function GlobalNavbar({
  character,
  onSettingsClick,
  onProfileClick,
  onHomeClick,
  onMapClick,
  onInventoryClick
}: GlobalNavbarProps) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Left: Game Title + Home Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-sm font-thin p-2"
            onClick={onHomeClick}
          >
            <Home className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">wojak-earth</span>
            <span className="sm:hidden">Earth</span>
          </Button>
        </div>

        {/* Center: Character Stats + Quick Actions (if logged in) */}
        {character && (
          <div className="flex items-center gap-2">
            {/* Profile Avatar Button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 mr-2"
              onClick={onProfileClick}
            >
              <Avatar className="w-8 h-8 hover:ring-2 hover:ring-primary/20 transition-all">
                <AvatarImage
                  src="/wojak.png"
                  alt={character.name}
                />
                <AvatarFallback>
                  <div className="text-xs">🥺</div>
                </AvatarFallback>
              </Avatar>
            </Button>

            {/* Stats */}
            <div className="flex items-center gap-3 text-sm mr-2">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 font-thin" />
                <span className="hidden xs:inline font-thin">{character.energy}</span>
                <span className="xs:hidden font-thin">{character.energy}</span>
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                <span className="hidden xs:inline font-thin">{character.health}</span>
                <span className="xs:hidden font-thin">{character.health}</span>
              </span>
            </div>

            {/* Quick Action Buttons - Only show on larger screens */}
            <div className="hidden sm:flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={onHomeClick}
              >
                <MapPin className="w-4 h-4" />
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
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8"
                onClick={onSettingsClick}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Right: Wallet, Theme */}
        <div className="flex items-center gap-2">
          <div className="scale-90">
            <WalletConnectButton />
          </div>
          <div className="scale-90">
            <ModeToggle />
          </div>
        </div>
      </div>
    </nav>
  )
}
