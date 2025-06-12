import { useState } from 'react'
import {
  User,
  Home,
  Activity,
  Terminal,
  Package,
  MapPin,
  Database
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
      label: 'PROFILE_ACCESS',
      action: onProfileClick,
      isActive: currentView === 'profile',
      showAvatar: true,
      colorClass: 'text-cyan-500'
    },
    {
      id: 'inventory',
      icon: Package,
      label: 'STORAGE_BAY',
      action: onInventoryClick,
      isActive: currentView === 'inventory',
      showAvatar: false,
      colorClass: 'text-purple-500',
      badge: character?.inventory?.length
    },
    {
      id: 'map',
      icon: MapPin,
      label: 'NAVIGATION',
      action: onMapClick,
      isActive: currentView === 'map',
      showAvatar: false,
      colorClass: 'text-green-500'
    },
    {
      id: 'home',
      icon: Home,
      label: 'HOME_BASE',
      action: onHomeClick,
      isActive: currentView === 'main',
      showAvatar: false,
      colorClass: 'text-orange-500'
    }
  ]

  const radius = 120

  const handleButtonClick = (action: () => void) => {
    setHovering(false)
    action()
  }

  return (
    <div
      className="fixed top-20 right-4 z-[2147483647] font-mono"
      style={{
        all: 'unset',
        position: 'fixed',
        top: '80px',
        right: '16px',
        zIndex: 2147483647,
        fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
        pointerEvents: 'auto',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Terminal Center Hub */}
      <div
        className={`
          relative w-14 h-14 rounded bg-background border-2 border-primary/30 
          hover:border-primary/50 flex items-center justify-center shadow-lg 
          transition-all duration-300 hover:scale-110 bg-muted/30
          ${hovering ? 'border-primary/50' : 'border-primary/30'}
        `}
        style={{
          all: 'unset',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: hovering ? 'scale(1.1)' : 'scale(1)',
          cursor: 'pointer',
          boxSizing: 'border-box'
        }}
      >
        <div className="relative">
          <Terminal
            className={`w-5 h-5 text-primary transition-transform duration-300 ${hovering ? 'rotate-90' : ''}`}
          />
          {/* Activity Indicator */}
          <div className="absolute -top-1 -right-1">
            <Activity className="w-3 h-3 text-green-500 animate-pulse" />
          </div>
        </div>

        {/* System Status */}
        {hovering && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <div className="inline-flex items-center px-2 py-1 bg-background border border-primary/30 rounded text-xs font-mono">
              <Database className="w-3 h-3 mr-1 text-primary" />
              <span className="text-primary">QUICK_ACCESS</span>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Radial Interface */}
      {buttons.map((btn, i) => {
        const angleDeg = 180 + (90 / (buttons.length - 1)) * i
        const angleRad = (angleDeg * Math.PI) / 180
        const x = radius * Math.cos(angleRad)
        const y = Math.abs(radius * Math.sin(angleRad))
        const IconComponent = btn.icon

        return (
          <div key={btn.id} className="relative">
            <button
              className={`
                absolute w-12 h-12 rounded border-2 shadow-lg transition-all duration-300 ease-out font-mono
                bg-background border-primary/30 hover:border-primary/50 text-primary hover:bg-muted/50
                ${hovering ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
                ${btn.isActive ? 'border-primary bg-primary/10 shadow-primary/20' : ''}
                hover:scale-110 hover:shadow-xl
                ${btn.id === 'profile' ? 'overflow-hidden p-0' : 'flex items-center justify-center'}
              `}
              style={{
                // Selective resets instead of 'all: unset'
                position: 'absolute',
                left: `${-17 + x}px`,
                top: `${28 + y}px`,
                width: '48px',
                height: '48px',
                margin: '0',
                padding: btn.id === 'profile' ? '0' : '12px',
                // border: 'none', // Let Tailwind handle borders
                border: '1px solid #333',
                background: 'none', // Let Tailwind handle background
                outline: 'none',
                textDecoration: 'none',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                color: 'inherit',
                // Layout and animation properties
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: hovering ? '1' : '0',
                transform: hovering ? 'scale(1)' : 'scale(0.5)',
                transitionDelay: hovering ? `${i * 50}ms` : '0ms',
                overflow: btn.id === 'profile' ? 'hidden' : 'visible',
                boxSizing: 'border-box',
                pointerEvents: 'auto',
              }}
              onClick={() => handleButtonClick(btn.action)}
              aria-label={btn.label}
            >
              {btn.id === 'profile' ? (
                <div className="relative w-full h-full">
                  <img
                    src={character.current_image_url || '/wojak.png'}
                    alt={character.name}
                    className="w-full h-full object-cover border border-primary/20"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/wojak.png'
                    }}
                  />
                  {btn.isActive && (
                    <div className="absolute inset-0 border-2 border-primary bg-primary/20" />
                  )}
                </div>
              ) : (
                <div className="relative">
                  <IconComponent className={`w-5 h-5 ${btn.isActive ? 'text-primary' : btn.colorClass}`} />
                  {/* Badge for inventory count */}
                  {btn.badge && (
                    <div className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs font-mono bg-primary/20 text-primary border border-primary/30 rounded-full flex items-center justify-center">
                      {btn.badge > 99 ? '99+' : btn.badge}
                    </div>
                  )}
                  {/* Active Indicator */}
                  {btn.isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              )}
            </button>

            {/* Terminal Labels */}
            {hovering && (
              <div
                className="absolute text-xs font-mono text-primary whitespace-nowrap pointer-events-none"
                style={{
                  left: `${-17 + x + (x > 0 ? 50 : -80)}px`,
                  top: `${28 + y + 15}px`,
                }}
              >
                <div className="bg-background border border-primary/30 px-2 py-1 rounded shadow-lg">
                  <div className="flex items-center gap-1">
                    <IconComponent className={`w-3 h-3 ${btn.colorClass}`} />
                    <span>{btn.label}</span>
                  </div>
                  {btn.badge && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {btn.badge}_ITEMS
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Connection Lines */}
            {hovering && (
              <div
                className="absolute w-0.5 bg-primary/30 transition-all duration-300"
                style={{
                  left: `${-1 + (x / 2)}px`,
                  top: `${42 + (y / 2)}px`,
                  height: `${Math.sqrt(x * x + y * y) / 2}px`,
                  transform: `rotate(${angleDeg}deg)`,
                  transformOrigin: 'top center',
                }}
              />
            )}
          </div>
        )
      })}

      {/* Terminal Grid Background */}
      {hovering && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute border border-primary/10 rounded-full"
            style={{
              width: `${radius * 2}px`,
              height: `${radius * 2}px`,
              left: `${28 - radius}px`,
              top: `${28 - radius}px`,
            }}
          />
          <div
            className="absolute border border-primary/10 rounded-full"
            style={{
              width: `${radius * 1.5}px`,
              height: `${radius * 1.5}px`,
              left: `${28 - radius * 0.75}px`,
              top: `${28 - radius * 0.75}px`,
            }}
          />
        </div>
      )}
    </div>
  )
} ``
