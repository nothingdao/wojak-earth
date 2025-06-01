import { Button } from '@/components/ui/button'
import { Zap, Heart, Map, Backpack, MapPin, BoxIcon } from 'lucide-react'
import { ModeToggle } from './mode-toggle'
import type { Character } from '@/types'
import { WalletConnectButton } from './wallet-connect-button'

interface GlobalNavbarProps {
  character: Character | null
  onProfileClick?: () => void
  onHomeClick?: () => void
  onMapClick?: () => void
  onSandboxClick?: () => void
  onInventoryClick?: () => void
}

export function GlobalNavbar({
  character,
  onProfileClick,
  onHomeClick,
  onMapClick,
  onSandboxClick,
  onInventoryClick
}: GlobalNavbarProps) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 relative w-full">
        {/* Left: Game Title + Home Button */}
        <div className="flex items-center gap-2 z-10">
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
              <span className="hidden sm:inline">wojak-earth</span>
              <span className="sm:hidden">Earth</span>
            </div>
          </Button>
        </div>

        {/* Center: Character Stats + Quick Actions (if logged in) */}
        <div className="absolute left-1/2 transform -translate-x-1/2 z-0">
          {character && (
            <div className="flex items-center gap-2">


              {/* Quick Action Buttons - Only show on larger screens */}
              <div className="hidden sm:flex items-center gap-1">
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url('/wojak.png')`
                  }}
                  onClick={onProfileClick}
                  aria-label={`${character.name} profile`}
                >
                </Button>
              </div>

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


            </div>
          )}
        </div>

        {/* Right: Wallet, Theme */}
        <div className="flex items-center gap-2 z-10">
          <WalletConnectButton />
          <ModeToggle />
        </div>
      </div>
    </nav>
  )
}
