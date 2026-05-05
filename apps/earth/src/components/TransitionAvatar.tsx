// src/components/TransitionAvatar.tsx - Avatar with glitch transition for URL changes
import { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface TransitionAvatarProps {
  src: string
  alt: string
  fallback: string
  className?: string
  onInstantGlitch?: (glitchFunction: () => void) => void
}

export function TransitionAvatar({
  src,
  alt,
  fallback,
  className = '',
  onInstantGlitch
}: TransitionAvatarProps) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [imageError, setImageError] = useState(false)
  const frontAvatarRef = useRef<HTMLDivElement>(null)
  const backAvatarRef = useRef<HTMLDivElement>(null)

  // Trigger instant glitch effect
  const triggerInstantGlitch = () => {
    const frontAvatar = frontAvatarRef.current
    if (frontAvatar && !isTransitioning) {
      frontAvatar.classList.add('equipment-instant-glitch')
      setTimeout(() => {
        frontAvatar.classList.remove('equipment-instant-glitch')
      }, 250)
    }
  }

  // Provide instant glitch function to parent
  useEffect(() => {
    if (onInstantGlitch) {
      onInstantGlitch(triggerInstantGlitch)
    }
  }, [onInstantGlitch])

  // Handle URL changes with transition
  useEffect(() => {
    if (src !== currentSrc && !isTransitioning) {
      setIsTransitioning(true)
      
      // Pre-load the new image to back avatar
      const backAvatar = backAvatarRef.current
      if (backAvatar) {
        // Create a new image to preload
        const img = new Image()
        img.onload = () => {
          // Image loaded successfully, start transition
          const frontAvatar = frontAvatarRef.current
          if (frontAvatar && backAvatar) {
            // Start glitch on front avatar (old image)
            frontAvatar.classList.add('equipment-glitch-out')
            
            // Show back avatar with new image and fade in
            backAvatar.style.opacity = '1'
            backAvatar.style.zIndex = '3'
            backAvatar.classList.add('equipment-fade-in')
            
            // After transition completes, clean up
            setTimeout(() => {
              // Update current src and reset
              setCurrentSrc(src)
              frontAvatar.classList.remove('equipment-glitch-out')
              backAvatar.classList.remove('equipment-fade-in')
              backAvatar.style.opacity = '0'
              backAvatar.style.zIndex = '1'
              setIsTransitioning(false)
              setImageError(false)
            }, 600)
          }
        }
        img.onerror = () => {
          // Image failed to load, just update without transition
          setCurrentSrc(src)
          setIsTransitioning(false)
          setImageError(true)
        }
        img.src = src
      }
    }
  }, [src, currentSrc, isTransitioning])

  const handleImageError = () => {
    setImageError(true)
  }

  const handleImageLoad = () => {
    setImageError(false)
  }

  return (
    <div className="relative equipment-canvas-container">
      {/* Back avatar for new image during transition */}
      <div 
        ref={backAvatarRef}
        className="equipment-canvas-back absolute inset-0"
        style={{ opacity: 0, zIndex: 1, pointerEvents: 'none' }}
      >
        <Avatar className={className}>
          <AvatarImage
            src={src}
            alt={alt}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
          <AvatarFallback className="bg-muted/50 font-mono text-xs">
            {fallback}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Front avatar - currently visible */}
      <div 
        ref={frontAvatarRef}
        className="equipment-canvas-front relative"
        style={{ zIndex: 2 }}
      >
        <Avatar className={className}>
          <AvatarImage
            src={imageError ? '/earth.png' : currentSrc}
            alt={alt}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
          <AvatarFallback className="bg-muted/50 font-mono text-xs">
            {fallback}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  )
}