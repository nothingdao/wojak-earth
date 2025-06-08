import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Backpack,
  Map,
  Home,
  Orbit
} from 'lucide-react'
import type { Character, GameView } from '@/types'

interface PlayerFastNavProps {
  character: Character | null
  currentView: GameView
  onProfileClick: () => void
  onHomeClick: () => void
  onMapClick: () => void
  onInventoryClick: () => void
}

export function PlayerFastNav({
  character,
  currentView,
  onProfileClick,
  onHomeClick,
  onMapClick,
  onInventoryClick
}: PlayerFastNavProps) {
  const [hovering, setHovering] = useState(false)

  if (!character) return null

  const buttons = [
    {
      id: 'profile',
      icon: User,
      label: 'Profile',
      action: onProfileClick,
      isActive: currentView === 'profile',
      showAvatar: true
    },
    {
      id: 'inventory',
      icon: Backpack,
      label: 'Inventory',
      action: onInventoryClick,
      isActive: currentView === 'inventory',
      showAvatar: false
    },
    {
      id: 'map',
      icon: Map,
      label: 'Map',
      action: onMapClick,
      isActive: currentView === 'map',
      showAvatar: false
    },
    {
      id: 'home',
      icon: Home,
      label: 'Home',
      action: onHomeClick,
      isActive: currentView === 'main',
      showAvatar: false
    }
  ]

  const radius = 140 // px distance from center

  const handleButtonClick = (action: () => void) => {
    setHovering(false)
    action()
  }

  return (
    <div
      className="fixed top-20 right-4 z-40"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Center trigger button */}
      <div className="relative w-16 h-16 rounded-full bg-card hover:bg-accent flex items-center justify-center shadow-lg border border-border transition-all duration-300 hover:scale-110">
        <div className="relative">
          <Orbit
            className={`w-6 h-6 text-foreground transition-transform duration-300 ${hovering ? 'rotate-90' : ''
              }`}
          />
        </div>
      </div>

      {/* Radial buttons */}
      {buttons.map((btn, i) => {
        // Quarter arc: from 180° (left) going DOWN to 270° (bottom)
        const angleDeg = 180 + (90 / (buttons.length - 1)) * i
        const angleRad = (angleDeg * Math.PI) / 180
        const x = radius * Math.cos(angleRad)
        const y = Math.abs(radius * Math.sin(angleRad)) // Make Y positive to go down
        const IconComponent = btn.icon

        return (
          <Button
            key={btn.id}
            size="lg"
            variant="secondary"
            className={`
              absolute w-12 h-12 rounded-full shadow-lg transition-all duration-300 ease-out
              bg-card hover:bg-accent text-card-foreground border border-border
              ${hovering ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
              ${btn.isActive ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''}
              hover:scale-110 hover:shadow-xl
              ${btn.id === 'profile' ? 'overflow-hidden p-0' : ''}
            `}
            style={{
              left: `${-18 + x}px`, // 32px = half of center button width (16px) + half of radial button width (12px)
              top: `${32 + y}px`,   // 32px = half of center button height (16px) + half of radial button height (12px)
              transitionDelay: hovering ? `${i * 50}ms` : '0ms',
            }}
            onClick={() => handleButtonClick(btn.action)}
            aria-label={btn.label}
          >
            {btn.id === 'profile' ? (
              <img
                src={character.currentImageUrl || '/wojak.png'}
                alt={character.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/wojak.png'
                }}
              />
            ) : (
              <IconComponent className="w-5 h-5" />
            )}
          </Button>
        )
      })}
    </div>
  )
}
