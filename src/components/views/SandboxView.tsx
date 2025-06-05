/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/views/SandboxView.tsx
import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  Loader2,
  User,
  Image as ImageIcon,
} from 'lucide-react'
import { useWalletInfo } from '@/hooks/useWalletInfo'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from 'sonner'
import type { Character } from '@/types'

interface SandboxViewProps {
  character: Character | null
  onCharacterCreated?: () => void
}

export const SandboxView: React.FC<SandboxViewProps> = ({ character, onCharacterCreated }) => {
  const walletInfo = useWalletInfo()
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)
  const [selectedGender, setSelectedGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate random character image using dynamic layer detection
  const generateCharacterImage = async () => {
    setImageLoading(true)

    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Canvas not available')

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')

      // Set canvas size
      canvas.width = 400
      canvas.height = 400

      // Clear canvas
      ctx.clearRect(0, 0, 400, 400)

      // Dynamically load available layers from directories
      const loadAvailableLayers = async () => {
        const layerTypes = ['backgrounds', 'bases', 'clothing', 'accessories', 'overlays']
        const availableLayers: { [key: string]: string[] } = {}

        for (const layerType of layerTypes) {
          try {
            // For bases, clothing, and accessories, filter by gender prefix
            const isGenderSpecific = ['bases', 'clothing', 'accessories'].includes(layerType)

            if (isGenderSpecific) {
              // Try to load gender-specific files
              const genderPrefix = selectedGender.toLowerCase()
              const testFiles = [
                `${genderPrefix}-yankees-hat.png`,
                `${genderPrefix}-cigarette.png`,
                `${genderPrefix}.png` // for bases
              ]

              const validFiles: string[] = []

              for (const file of testFiles) {
                try {
                  // Test if file exists by trying to load it
                  const testImg = new Image()
                  const fileExists = await new Promise((resolve) => {
                    testImg.onload = () => resolve(true)
                    testImg.onerror = () => resolve(false)
                    testImg.src = `/layers/${layerType}/${file}`
                  })

                  if (fileExists) {
                    validFiles.push(file)
                  }
                } catch (error) {
                  // File doesn't exist, skip it
                }
              }

              availableLayers[layerType] = validFiles
            } else {
              // For non-gender specific layers (backgrounds, overlays)
              const commonFiles = [
                'cyber-city.png',
                'desert-outpost.png',
                'mining-plains.png',
                'glitch-vibe.png',
                'glow-red.png',
                'rain-fog.png'
              ]

              const validFiles: string[] = []

              for (const file of commonFiles) {
                try {
                  const testImg = new Image()
                  const fileExists = await new Promise((resolve) => {
                    testImg.onload = () => resolve(true)
                    testImg.onerror = () => resolve(false)
                    testImg.src = `/layers/${layerType}/${file}`
                  })

                  if (fileExists) {
                    validFiles.push(file)
                  }
                } catch (error) {
                  // File doesn't exist, skip it
                }
              }

              availableLayers[layerType] = validFiles
            }
          } catch (error) {
            console.warn(`Could not load ${layerType} directory`)
            availableLayers[layerType] = []
          }
        }

        return availableLayers
      }

      const layers = await loadAvailableLayers()
      console.log('Dynamically loaded layers:', layers)

      // Random selection from available files
      const selectedLayers = {
        background: layers.backgrounds?.length > 0 ?
          layers.backgrounds[Math.floor(Math.random() * layers.backgrounds.length)] : null,
        base: layers.bases?.length > 0 ?
          layers.bases[Math.floor(Math.random() * layers.bases.length)] : null,
        clothing: (layers.clothing?.length > 0 && Math.random() > 0.2) ?
          layers.clothing[Math.floor(Math.random() * layers.clothing.length)] : null,
        accessory: (layers.accessories?.length > 0 && Math.random() > 0.4) ?
          layers.accessories[Math.floor(Math.random() * layers.accessories.length)] : null,
        overlay: (layers.overlays?.length > 0 && Math.random() > 0.7) ?
          layers.overlays[Math.floor(Math.random() * layers.overlays.length)] : null
      }

      console.log('Selected layers for', selectedGender + ':', selectedLayers)

      // Load and draw layers
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = `/layers/${src}`
        })
      }

      // Draw layers in order (background → base → clothing → accessories → overlay)
      const layerOrder = [
        ...(selectedLayers.background ? [{ type: 'backgrounds', file: selectedLayers.background }] : []),
        ...(selectedLayers.base ? [{ type: 'bases', file: selectedLayers.base }] : []),
        ...(selectedLayers.clothing ? [{ type: 'clothing', file: selectedLayers.clothing }] : []),
        ...(selectedLayers.accessory ? [{ type: 'accessories', file: selectedLayers.accessory }] : []),
        ...(selectedLayers.overlay ? [{ type: 'overlays', file: selectedLayers.overlay }] : [])
      ]

      for (const layer of layerOrder) {
        try {
          const img = await loadImage(`${layer.type}/${layer.file}`)
          ctx.drawImage(img, 0, 0, 400, 400)
          console.log(`✓ Loaded: ${layer.type}/${layer.file}`)
        } catch (error) {
          console.warn(`✗ Failed to load layer: ${layer.type}/${layer.file}`, error)
        }
      }

      // Convert to base64
      const imageDataUrl = canvas.toDataURL('image/png')
      setGeneratedImage(imageDataUrl)

      toast.success(`${selectedGender.toLowerCase()} character generated!`)

    } catch (error) {
      console.error('Image generation failed:', error)
      toast.error('Failed to generate character image')
    } finally {
      setImageLoading(false)
    }
  }

  // Create character with NFT
  const createCharacter = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Connect wallet first')
      return
    }

    if (!generatedImage) {
      toast.error('Generate character image first')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/.netlify/functions/mint-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: wallet.publicKey.toString(),
          gender: selectedGender,
          imageBlob: generatedImage // Send base64 image data
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Character created! ${result.character.name}`)
        console.log('Character:', result.character)
        console.log('NFT Address:', result.nftAddress)
        console.log('Image URL:', result.imageUrl)
        console.log('Metadata URI:', result.metadataUri)

        // Reset form
        setGeneratedImage(null)

        // Call the callback to refresh character data
        if (onCharacterCreated) {
          onCharacterCreated()
        } else {
          // Fallback to page reload if no callback provided
          window.location.reload()
        }

      } else {
        throw new Error(result.error)
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error('Character creation failed:', error)
        toast.error(`Failed: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>

      {/* Character Creation Section */}
      {walletInfo.connected && !character && (
        <div className='bg-card border rounded-lg p-6'>
          <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
            <User className='w-5 h-5' />
            Create Your Character
          </h3>

          <div className='space-y-4'>
            {/* Gender Selection */}
            <div>
              <label className='text-sm font-medium mb-2 block'>Gender</label>
              <div className='flex gap-2'>
                <Button
                  variant={selectedGender === 'MALE' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => {
                    setSelectedGender('MALE')
                    // Clear generated image when switching gender
                    setGeneratedImage(null)
                  }}
                >
                  Male
                </Button>
                <Button
                  variant={selectedGender === 'FEMALE' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => {
                    setSelectedGender('FEMALE')
                    // Clear generated image when switching gender
                    setGeneratedImage(null)
                  }}
                >
                  Female
                </Button>
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Each gender has unique clothing and accessory options
              </p>
            </div>

            {/* Image Generation */}
            <div>
              <label className='text-sm font-medium mb-2 block'>Character Appearance</label>

              {generatedImage ? (
                <div className='space-y-2'>
                  <img
                    src={generatedImage}
                    alt={`Generated ${selectedGender.toLowerCase()} character`}
                    className='w-64 h-64 rounded border'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={generateCharacterImage}
                    disabled={imageLoading}
                  >
                    {imageLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate {selectedGender.toLowerCase()}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  variant='outline'
                  onClick={generateCharacterImage}
                  disabled={imageLoading}
                >
                  {imageLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Generate {selectedGender.toLowerCase()} character
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Create Character Button */}
            <Button
              onClick={createCharacter}
              disabled={loading || !generatedImage}
              className="w-full"
              size='lg'
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Character...
                </>
              ) : (
                'Create Character & Mint NFT'
              )}
            </Button>

            {!generatedImage && (
              <p className='text-sm text-muted-foreground text-center'>
                Generate a character image first
              </p>
            )}
          </div>

          {/* Hidden canvas for image generation */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Character exists - show existing character info */}
      {character && (
        <div className='bg-card border rounded-lg p-6'>
          <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
            <User className='w-5 h-5' />
            Your Character
          </h3>

          <div className='space-y-4'>
            <div className='flex items-center gap-4'>
              {character.currentImageUrl && (
                <img
                  src={character.currentImageUrl}
                  alt={character.name}
                  className='w-16 h-16 rounded border'
                />
              )}
              <div>
                <div className='font-semibold'>{character.name}</div>
                <div className='text-sm text-muted-foreground'>
                  Level {character.level} • {character.gender} {character.characterType}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {character.currentLocation?.name}
                </div>
              </div>
            </div>

            <div className='grid grid-cols-3 gap-4 text-center text-sm'>
              <div>
                <div className='font-semibold'>{character.energy}</div>
                <div className='text-muted-foreground'>Energy</div>
              </div>
              <div>
                <div className='font-semibold'>{character.health}</div>
                <div className='text-muted-foreground'>Health</div>
              </div>
              <div>
                <div className='font-semibold'>{character.coins}</div>
                <div className='text-muted-foreground'>Coins</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
