// src/components/EquipmentVisualizer.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Eye, EyeOff, Download, Maximize2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Character } from '@/types'

// Export the component as default
export default EquipmentVisualizer

interface EquipmentVisualizerProps {
  character: Character
  size?: 'small' | 'medium' | 'large'
  showControls?: boolean
  className?: string
  onImageExport?: (exportFunction: () => Promise<Blob | null>) => void
  onInstantGlitch?: (glitchFunction: () => void) => void
}

interface Manifest {
  [layer_type: string]: {
    male?: (string | { file: string;[key: string]: any })[]
    female?: (string | { file: string;[key: string]: any })[]
    neutral?: (string | { file: string;[key: string]: any })[]
  }
}

// Layer order for proper rendering
const LAYER_ORDER = [
  'backgrounds',
  '1-base',
  '2-skin',
  '3-undergarments',
  '4-clothing',
  '5-outerwear',
  '6-hair',
  '7-face-accessories',
  '8-headwear',
  '9-misc-accessories',
  'overlays'
]

// Map equipment slots to layer types
const SLOT_TO_LAYER_MAP = {
  'hair': '6-hair',
  'headwear': '8-headwear',
  'face_covering': '6-hair', // Face coverings can use hair layer for now
  'face_accessory': '7-face-accessories',
  'clothing': '4-clothing',
  'outerwear': '5-outerwear',
  'misc_accessory': '9-misc-accessories',
  'tool': '9-misc-accessories' // Tools can be visual accessories
}

export function EquipmentVisualizer({
  character,
  size = 'medium',
  showControls = true,
  className = '',
  onImageExport,
  onInstantGlitch
}: EquipmentVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backCanvasRef = useRef<HTMLCanvasElement>(null)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [visibleLayers, setVisibleLayers] = useState<Set<string>>(new Set(LAYER_ORDER))
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [previousCharacterState, setPreviousCharacterState] = useState<string | null>(null)

  // Size configurations
  const sizeConfig = {
    small: { canvas: 120, container: 'w-30 h-30' },
    medium: { canvas: 200, container: 'w-50 h-50' },
    large: { canvas: 400, container: 'w-100 h-100' }
  }

  const currentSize = sizeConfig[size]

  // Load manifest
  const loadManifest = useCallback(async (): Promise<Manifest> => {
    if (manifest) return manifest

    try {
      const response = await fetch('/layers/manifest.json')
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status}`)
      }
      const loadedManifest = await response.json()
      setManifest(loadedManifest)
      return loadedManifest
    } catch (error) {
      console.error('Failed to load manifest:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
      return {}
    }
  }, [manifest])

  // Get character's base layer file based on gender
  const getBaseLayerFile = useCallback((gender: string): string => {
    // Default base files based on gender
    return gender.toLowerCase() === 'female' ? 'female.png' : 'male.png'
  }, [])

  // Get equipped items organized by layer type
  const getEquippedItemsByLayer = useCallback(() => {
    if (!character.inventory) return {}

    const equippedByLayer: Record<string, any[]> = {}

    // Get equipped items and organize by layer type
    character.inventory
      .filter(inv => inv.is_equipped && inv.item.layer_file)
      .forEach(inv => {
        // Map the equipped slot to layer type
        const layerType = inv.equipped_slot ? SLOT_TO_LAYER_MAP[inv.equipped_slot as keyof typeof SLOT_TO_LAYER_MAP] : null

        // Fallback to item's layer_type if available
        const finalLayerType = layerType || inv.item.layer_type

        if (finalLayerType) {
          if (!equippedByLayer[finalLayerType]) {
            equippedByLayer[finalLayerType] = []
          }

          equippedByLayer[finalLayerType].push({
            file: inv.item.layer_file,
            isPrimary: inv.is_primary,
            slotIndex: inv.slot_index || 1,
            item: inv.item
          })
        }
      })

    // Sort by slot index and prioritize primary items
    Object.keys(equippedByLayer).forEach(layerType => {
      equippedByLayer[layerType].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1
        if (!a.isPrimary && b.isPrimary) return 1
        return a.slotIndex - b.slotIndex
      })
    })

    return equippedByLayer
  }, [character.inventory])

  // Generate a state key for the character to detect equipment changes
  const getCharacterState = useCallback(() => {
    if (!character.inventory) return ''
    const equippedItems = character.inventory
      .filter(inv => inv.is_equipped)
      .map(inv => `${inv.item.id}:${inv.equipped_slot}:${inv.is_primary}`)
      .sort()
      .join('|')
    return `${character.gender}:${equippedItems}`
  }, [character])

  // Render character on canvas with double buffering support
  const renderCharacter = useCallback(async (targetCanvas?: HTMLCanvasElement) => {
    const canvas = targetCanvas || canvasRef.current
    if (!canvas) return

    setIsLoading(true)
    setError(null)

    try {
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')

      // Set canvas size
      const canvasSize = currentSize.canvas
      canvas.width = canvasSize
      canvas.height = canvasSize

      // Clear canvas
      ctx.clearRect(0, 0, canvasSize, canvasSize)

      // Load manifest
      const loadedManifest = await loadManifest()
      if (!loadedManifest || Object.keys(loadedManifest).length === 0) {
        throw new Error('Manifest not loaded')
      }

      // Get equipped items by layer
      const equippedByLayer = getEquippedItemsByLayer()

      // Helper function to load images
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error(`Failed to load: ${src}`))
          img.src = src

          // Timeout after 5 seconds
          setTimeout(() => {
            if (!img.complete) {
              reject(new Error(`Load timeout: ${src}`))
            }
          }, 5000)
        })
      }

      // Render layers in order
      for (const layerType of LAYER_ORDER) {
        if (!visibleLayers.has(layerType)) continue

        try {
          let layerFile = null

          if (layerType === '1-base') {
            // Always render the base layer
            layerFile = getBaseLayerFile(character.gender)
          } else if (equippedByLayer[layerType] && equippedByLayer[layerType].length > 0) {
            // Use the primary equipped item for this layer
            layerFile = equippedByLayer[layerType][0].file
          }

          if (layerFile) {
            const imagePath = `/layers/${layerType}/${layerFile}`
            const img = await loadImage(imagePath)
            ctx.drawImage(img, 0, 0, canvasSize, canvasSize)
          }

        } catch (layerError) {
          console.warn(`Failed to load layer ${layerType}:`, layerError)
          // Continue with other layers instead of failing completely
        }
      }

    } catch (error) {
      console.error('Character rendering failed:', error)
      setError(error instanceof Error ? error.message : 'Rendering failed')
    } finally {
      setIsLoading(false)
    }
  }, [character, currentSize.canvas, loadManifest, getBaseLayerFile, getEquippedItemsByLayer, visibleLayers])

  // Trigger instant glitch effect for button feedback
  const triggerInstantGlitch = useCallback(() => {
    const frontCanvas = canvasRef.current
    if (frontCanvas && !isTransitioning) {
      frontCanvas.classList.add('equipment-instant-glitch')
      
      // Remove class after animation completes
      setTimeout(() => {
        frontCanvas.classList.remove('equipment-instant-glitch')
      }, 250)
    }
  }, [isTransitioning])

  // Export character image as blob
  const exportCharacterImage = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current
      if (!canvas) {
        resolve(null)
        return
      }

      canvas.toBlob((blob) => {
        resolve(blob)
      }, 'image/png', 0.95)
    })
  }, [])

  // Pre-render the NEW state to back canvas when character changes
  useEffect(() => {
    const currentState = getCharacterState()
    
    // When character state changes, immediately render the NEW state to back canvas
    if (backCanvasRef.current && !isTransitioning) {
      const backCanvas = backCanvasRef.current
      const canvasSize = currentSize.canvas
      backCanvas.width = canvasSize
      backCanvas.height = canvasSize
      
      console.log('🎨 Pre-rendering NEW state to back canvas')
      renderCharacter(backCanvas)
    }
    
    // If this is an equipment change (not initial load), start transition
    if (previousCharacterState && previousCharacterState !== currentState) {
      setIsTransitioning(true)
      
      // Give a moment for the pre-render to complete, then start transition
      setTimeout(() => {
        const frontCanvas = canvasRef.current
        const backCanvas = backCanvasRef.current
        
        if (frontCanvas && backCanvas) {
          console.log('🎨 Starting transition - back canvas has NEW state, front has OLD state')
          
          // Start glitch on front canvas (old image)
          frontCanvas.classList.add('equipment-glitch-out')
          
          // Simultaneously start fade-in on back canvas (new image) 
          backCanvas.style.opacity = '1'
          backCanvas.style.zIndex = '3'
          backCanvas.classList.add('equipment-fade-in')
          
          // After both animations complete, clean up
          setTimeout(() => {
            // Copy back canvas to front canvas
            const frontCtx = frontCanvas.getContext('2d')
            if (frontCtx) {
              frontCtx.clearRect(0, 0, frontCanvas.width, frontCanvas.height)
              frontCtx.drawImage(backCanvas, 0, 0)
            }
            
            // Reset both canvases
            frontCanvas.classList.remove('equipment-glitch-out')
            backCanvas.classList.remove('equipment-fade-in')
            backCanvas.style.opacity = '0'
            backCanvas.style.zIndex = '1'
            
            setIsTransitioning(false)
            console.log('🎨 Transition complete')
          }, 600)
        }
      }, 50) // Small delay to ensure back canvas render completes
    } else if (!previousCharacterState) {
      // Initial render - render to front canvas
      renderCharacter()
    }
    
    setPreviousCharacterState(currentState)
  }, [getCharacterState, previousCharacterState, renderCharacter, currentSize.canvas, isTransitioning])

  // Provide export function to parent
  useEffect(() => {
    if (onImageExport) {
      onImageExport(exportCharacterImage)
    }
  }, [onImageExport, exportCharacterImage])

  // Provide instant glitch function to parent
  useEffect(() => {
    if (onInstantGlitch) {
      onInstantGlitch(triggerInstantGlitch)
    }
  }, [onInstantGlitch, triggerInstantGlitch])

  // Toggle layer visibility
  const toggleLayer = (layerType: string) => {
    setVisibleLayers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(layerType)) {
        newSet.delete(layerType)
      } else {
        newSet.add(layerType)
      }
      return newSet
    })
  }

  // Download character image
  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `${character.name.replace(/\s+/g, '_')}_character.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Get equipped items for display
  const equippedItems = character.inventory?.filter(inv => inv.is_equipped) || []

  return (
    <>
      <div className={`bg-muted/20 border border-primary/20 rounded-lg p-4 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-primary font-bold text-sm font-mono">{character.name.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs font-mono">
              {equippedItems.length}_EQUIPPED
            </Badge>
            {showControls && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullscreen(true)}
                  className="h-6 w-6 p-0"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadImage}
                  className="h-6 w-6 p-0"
                  title="Download"
                  disabled={isLoading || !!error}
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={renderCharacter}
                  className="h-6 w-6 p-0"
                  title="Refresh"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Character Canvas */}
        <div className="flex justify-center mb-3">
          <div className={`${currentSize.container} border border-primary/30 rounded bg-muted/10 flex items-center justify-center relative overflow-hidden equipment-canvas-container`}>
            {error ? (
              <div className="text-center p-2">
                <div className="text-error text-xs font-mono mb-1">RENDER_ERROR</div>
                <div className="text-xs text-muted-foreground">{error}</div>
              </div>
            ) : (
              <>
                {/* Back canvas for double buffering */}
                <canvas
                  ref={backCanvasRef}
                  className="equipment-canvas-back max-w-full max-h-full object-contain"
                  style={{
                    width: currentSize.canvas,
                    height: currentSize.canvas,
                    imageRendering: 'pixelated',
                    opacity: 0,
                    pointerEvents: 'none'
                  }}
                />
                
                {/* Front canvas - visible to user */}
                <canvas
                  ref={canvasRef}
                  className="equipment-canvas-front max-w-full max-h-full object-contain"
                  style={{
                    width: currentSize.canvas,
                    height: currentSize.canvas,
                    imageRendering: 'pixelated'
                  }}
                />
              </>
            )}

          </div>
        </div>

        {/* Character Info */}
        <div className="bg-muted/30 border border-primary/10 rounded p-2">
          <div className="text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">GENDER:</span>
              <span className="text-primary">{character.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LEVEL:</span>
              <span className="text-primary">{character.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ITEMS:</span>
              <span className="text-success">{equippedItems.length}/12</span>
            </div>
          </div>
        </div>

        {/* Layer Controls (only if showControls) */}
        {showControls && (
          <div className="mt-3 border-t border-primary/10 pt-3">
            <div className="text-xs font-mono text-muted-foreground mb-2">LAYER_VISIBILITY:</div>
            <div className="grid grid-cols-2 gap-1">
              {LAYER_ORDER.map(layerType => (
                <Button
                  key={layerType}
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleLayer(layerType)}
                  className={`h-6 text-xs font-mono px-2 ${visibleLayers.has(layerType)
                    ? 'text-success border-success/30'
                    : 'text-muted-foreground border-muted/30'
                    }`}
                >
                  {visibleLayers.has(layerType) ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                  {layerType.replace(/^\d+-/, '').toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {character.name.toUpperCase()}_FULL_DISPLAY
            </DialogTitle>
          </DialogHeader>

          <div className="flex justify-center">
            <EquipmentVisualizer
              character={character}
              size="large"
              showControls={true}
              className="w-full max-w-md"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
