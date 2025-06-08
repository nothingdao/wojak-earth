// src/components/views/SandboxView.tsx - CLEAN FIXED VERSION
import React, { useState, useRef, useEffect, useCallback } from 'react'
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
import SimplePayment from '@/components/SimplePayment'
import type { Character } from '@/types'

interface SandboxViewProps {
  character: Character | null
  onCharacterCreated?: () => void
}

// Type definitions for manifest structure
interface AssetEntry {
  file: string
  compatible_headwear?: string[]
  incompatible_headwear?: string[]
  requires_hair?: string[]
  incompatible_hair?: string[]
  incompatible_base?: string[]

  compatible_outerwear?: string[]
  incompatible_outerwear?: string[]
  rules?: Record<string, unknown>
}

interface LayerManifest {
  male?: (string | AssetEntry)[]
  female?: (string | AssetEntry)[]
  neutral?: (string | AssetEntry)[]
}

interface Manifest {
  [layerType: string]: LayerManifest | any  // Allow any for compatibility_rules
  compatibility_rules?: {
    hair_headwear_conflicts?: Record<string, { blocks?: string[]; allows?: string[] }>
    outerwear_combinations?: Record<string, { blocks_headwear?: string[]; allows_headwear?: string[] }>
    style_themes?: Record<string, { preferred_combinations?: string[][] }>
  }
}

type GenderFilter = 'ALL' | 'MALE' | 'FEMALE'

// Define proper layer order with probability weights
const LAYER_CONFIG = {
  '1-base': { required: true, probability: 1.0 },
  '2-skin': { required: false, probability: 0.3 },
  '3-undergarments': { required: false, probability: 0.4 },
  '4-clothing': { required: false, probability: 0.8 },
  '5-outerwear': { required: false, probability: 0.6 },
  '6-hair': { required: true, probability: 1.0 },
  '7-face-accessories': { required: false, probability: 0.3 },
  '8-headwear': { required: false, probability: 0.4 },
  '9-misc-accessories': { required: false, probability: 0.2 },
  'backgrounds': { required: true, probability: 1.0 },
  'overlays': { required: false, probability: 0.3 }
}

// Parse asset entry
const parseAssetEntry = (entry: string | AssetEntry): { file: string; rules?: AssetEntry } => {
  if (typeof entry === 'string') {
    return { file: entry }
  }
  if (typeof entry === 'object' && entry.file) {
    return { file: entry.file, rules: entry }
  }
  return { file: '' }
}

// Get available assets for a layer based on gender and manifest
const getLayerAssets = (manifest: Manifest, layerType: string, gender: 'MALE' | 'FEMALE'): string[] => {
  const layerData = manifest[layerType] as LayerManifest | undefined
  if (!layerData || layerType === 'compatibility_rules') return []

  const genderKey = gender.toLowerCase() as 'male' | 'female'
  const availableAssets: string[] = []

  // Add gender-specific assets
  if (layerData[genderKey]) {
    for (const entry of layerData[genderKey]) {
      const parsed = parseAssetEntry(entry)
      if (parsed.file) {
        availableAssets.push(parsed.file)
      }
    }
  }

  // Add neutral assets
  if (layerData.neutral) {
    for (const entry of layerData.neutral) {
      const parsed = parseAssetEntry(entry)
      if (parsed.file) {
        availableAssets.push(parsed.file)
      }
    }
  }

  return availableAssets
}

// Check compatibility
// Updated areAssetsCompatible function to check asset-level rules
const areAssetsCompatible = (manifest: Manifest, selectedLayers: Record<string, string | null>): boolean => {
  const rules = manifest.compatibility_rules || {}

  // Check hair-headwear conflicts (existing global rules)
  const selectedHair = selectedLayers['6-hair']
  const selectedHeadwear = selectedLayers['8-headwear']
  const selectedBase = selectedLayers['1-base']

  console.log('🔍 Checking compatibility:', {
    base: selectedBase,
    hair: selectedHair,
    headwear: selectedHeadwear
  })

  // Check base/hair compatibility FIRST
  if (selectedBase && selectedHair) {
    console.log('🧠 Checking base/hair compatibility...')

    // Check if base has incompatible_hair restrictions
    const baseAsset = findAssetEntry(manifest, '1-base', selectedBase)
    console.log('📦 Base asset found:', baseAsset)

    if (baseAsset && baseAsset.incompatible_hair) {
      console.log('❌ Base has incompatible_hair:', baseAsset.incompatible_hair)
      if (baseAsset.incompatible_hair.includes(selectedHair)) {
        console.log('🚫 BLOCKING: Base incompatible with hair!')
        return false
      }
    }

    // Check if hair has incompatible_base restrictions
    const hairAsset = findAssetEntry(manifest, '6-hair', selectedHair)
    console.log('💇 Hair asset found:', hairAsset)

    if (hairAsset && hairAsset.incompatible_base) {
      console.log('❌ Hair has incompatible_base:', hairAsset.incompatible_base)
      if (hairAsset.incompatible_base.includes(selectedBase)) {
        console.log('🚫 BLOCKING: Hair incompatible with base!')
        return false
      }
    }
  }

  // Rest of your existing compatibility checks...
  if (selectedHair && selectedHeadwear && rules.hair_headwear_conflicts) {
    const hairConflicts = rules.hair_headwear_conflicts[selectedHair]
    if (hairConflicts) {
      if (hairConflicts.blocks && hairConflicts.blocks.includes(selectedHeadwear)) {
        return false
      }
      if (hairConflicts.allows && !hairConflicts.allows.includes(selectedHeadwear)) {
        return false
      }
    }
  }

  if (selectedHair && selectedHeadwear) {
    const headwearAsset = findAssetEntry(manifest, '8-headwear', selectedHeadwear)
    if (headwearAsset && headwearAsset.incompatible_hair) {
      if (headwearAsset.incompatible_hair.includes(selectedHair)) {
        return false
      }
    }

    if (headwearAsset && headwearAsset.requires_hair) {
      if (headwearAsset.requires_hair.length > 0 && !headwearAsset.requires_hair.includes(selectedHair)) {
        return false
      }
    }

    const hairAsset = findAssetEntry(manifest, '6-hair', selectedHair)
    if (hairAsset && hairAsset.incompatible_headwear) {
      if (hairAsset.incompatible_headwear.includes(selectedHeadwear)) {
        return false
      }
    }
  }

  const selectedOuterwear = selectedLayers['5-outerwear']
  if (selectedOuterwear && selectedHeadwear && rules.outerwear_combinations) {
    const outerwearConflicts = rules.outerwear_combinations[selectedOuterwear]
    if (outerwearConflicts) {
      if (outerwearConflicts.blocks_headwear && outerwearConflicts.blocks_headwear.includes(selectedHeadwear)) {
        return false
      }
      if (outerwearConflicts.allows_headwear && !outerwearConflicts.allows_headwear.includes(selectedHeadwear)) {
        return false
      }
    }
  }

  console.log('✅ Combination allowed')
  return true
}

// Helper function to find asset entry with rules
const findAssetEntry = (manifest: Manifest, layerType: string, fileName: string): AssetEntry | null => {
  const layerData = manifest[layerType] as LayerManifest | undefined
  if (!layerData || layerType === 'compatibility_rules') return null

  // Search in all gender categories
  const allEntries = [
    ...(layerData.male || []),
    ...(layerData.female || []),
    ...(layerData.neutral || [])
  ]

  for (const entry of allEntries) {
    if (typeof entry === 'object' && entry.file === fileName) {
      return entry
    }
  }

  return null
}

// Get compatible assets
const getCompatibleAssets = (manifest: Manifest, layerType: string, selectedLayers: Record<string, string | null>, gender: 'MALE' | 'FEMALE'): string[] => {
  const layerAssets = getLayerAssets(manifest, layerType, gender)
  const compatibleAssets: string[] = []

  for (const asset of layerAssets) {
    const testSelection = { ...selectedLayers, [layerType]: asset }
    if (areAssetsCompatible(manifest, testSelection)) {
      compatibleAssets.push(asset)
    }
  }

  return compatibleAssets
}

export const SandboxView: React.FC<SandboxViewProps> = ({ character, onCharacterCreated }) => {
  const walletInfo = useWalletInfo()
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)
  const [selectedLayers, setSelectedLayers] = useState<Record<string, string | null> | null>(null)

  // State with proper defaults
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('MALE')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [currentGender, setCurrentGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Payment state
  const [showPayment, setShowPayment] = useState(false)

  // Load and parse the layers manifest
  const loadLayersManifest = async (): Promise<Manifest> => {
    try {
      const response = await fetch('/layers/manifest.json')
      if (!response.ok) {
        throw new Error('Failed to load manifest')
      }
      return await response.json() as Manifest
    } catch (error) {
      console.error('Failed to load layers manifest:', error)
      return {}
    }
  }

  // Generate character image
  // Generate character image - SIMPLE FIX
  const generateCharacterImage = useCallback(async () => {
    setImageLoading(true)

    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Canvas not available')

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')

      // Set canvas size
      canvas.width = 400
      canvas.height = 400
      ctx.clearRect(0, 0, 400, 400)

      // Determine gender for this generation
      let selectedGender: 'MALE' | 'FEMALE'
      if (genderFilter === 'ALL') {
        selectedGender = Math.random() < 0.5 ? 'MALE' : 'FEMALE'
      } else {
        selectedGender = genderFilter as 'MALE' | 'FEMALE'
      }

      setCurrentGender(selectedGender)
      console.log('🎯 Generating character:', selectedGender)

      // Load manifest
      const manifest = await loadLayersManifest()

      // Select layers
      const newSelectedLayers: Record<string, string | null> = {}

      // First pass: required layers (but check compatibility for hair)
      for (const [layerType, config] of Object.entries(LAYER_CONFIG)) {
        if (config.required) {
          if (layerType === '6-hair') {
            // For hair, check compatibility with already selected base
            const compatibleAssets = getCompatibleAssets(manifest, layerType, newSelectedLayers, selectedGender)
            if (compatibleAssets.length > 0) {
              newSelectedLayers[layerType] = compatibleAssets[Math.floor(Math.random() * compatibleAssets.length)]
            } else {
              // Fallback to any hair if no compatible ones
              const availableAssets = getLayerAssets(manifest, layerType, selectedGender)
              if (availableAssets.length > 0) {
                newSelectedLayers[layerType] = availableAssets[Math.floor(Math.random() * availableAssets.length)]
              }
            }
          } else {
            // For other required layers (like base), just pick randomly
            const availableAssets = getLayerAssets(manifest, layerType, selectedGender)
            if (availableAssets.length > 0) {
              newSelectedLayers[layerType] = availableAssets[Math.floor(Math.random() * availableAssets.length)]
            }
          }
        }
      }

      // Second pass: optional layers (with compatibility checking)
      for (const [layerType, config] of Object.entries(LAYER_CONFIG)) {
        if (!config.required && Math.random() < config.probability) {
          const compatibleAssets = getCompatibleAssets(manifest, layerType, newSelectedLayers, selectedGender)
          if (compatibleAssets.length > 0) {
            newSelectedLayers[layerType] = compatibleAssets[Math.floor(Math.random() * compatibleAssets.length)]
          }
        }

        if (!newSelectedLayers[layerType]) {
          newSelectedLayers[layerType] = null
        }
      }

      setSelectedLayers(newSelectedLayers)

      // Load and draw images
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = src
        })
      }

      const layerOrder = Object.keys(LAYER_CONFIG)

      for (const layerType of layerOrder) {
        const selectedFile = newSelectedLayers[layerType]
        if (!selectedFile) continue

        try {
          const img = await loadImage(`/layers/${layerType}/${selectedFile}`)
          ctx.drawImage(img, 0, 0, 400, 400)
          console.log(`✓ Loaded: ${layerType}/${selectedFile}`)
        } catch (error) {
          console.warn(`✗ Failed to load layer: ${layerType}/${selectedFile}`, error)
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
  }, [genderFilter])

  // Handle gender filter change
  const handleGenderFilterChange = (newFilter: GenderFilter) => {
    setGenderFilter(newFilter)
  }

  // Handle payment success
  const handlePaymentSuccess = (paymentSignature: string) => {
    setShowPayment(false)
    createCharacterWithPayment(paymentSignature)
  }

  // Handle payment cancelled
  const handlePaymentCancelled = () => {
    setShowPayment(false)
    toast.info('Character creation cancelled')
  }

  // Handle start creation
  const handleStartCreation = () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Connect wallet first')
      return
    }

    if (!generatedImage) {
      toast.error('Generate character image first')
      return
    }

    setShowPayment(true)
  }

  // Create character with payment
  const createCharacterWithPayment = async (paymentSignature: string) => {
    setLoading(true)

    try {
      const response = await fetch('/.netlify/functions/mint-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: wallet.publicKey!.toString(),
          gender: currentGender,
          imageBlob: generatedImage,
          selectedLayers: selectedLayers,
          paymentSignature: paymentSignature
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`${result.character.name} created successfully! 🎉`)

        // Instead of clearing everything, show success state briefly
        setLoading(false)
        setShowPayment(false)

        // Auto-generate new character after 2 seconds for rapid testing
        setTimeout(() => {
          setGeneratedImage(null)
          setSelectedLayers(null)
          generateCharacterImage()
        }, 2000)

        if (onCharacterCreated) {
          onCharacterCreated()
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

  // Auto-generate on mount and gender change
  useEffect(() => {
    if (walletInfo.connected && !character) {
      generateCharacterImage()
    }
  }, [walletInfo.connected, character, generateCharacterImage])

  return (
    <div className='space-y-6'>
      {/* Simple Payment Modal */}
      {showPayment && (
        <SimplePayment
          characterData={{
            gender: currentGender,
            selectedLayers: selectedLayers
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancelled}
        />
      )}

      {/* Character Creation Section */}
      {walletInfo.connected && !character && !showPayment && (
        <div className='bg-card border rounded-lg p-6'>
          <h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
            <User className='w-5 h-5' />
            Create Your Character
          </h3>

          <div className='space-y-4'>
            {/* Gender Filter */}
            <div>
              <label className='text-sm font-medium mb-2 block'>Character Type</label>
              <div className='flex gap-2'>
                <Button
                  variant={genderFilter === 'ALL' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => handleGenderFilterChange('ALL')}
                  disabled={imageLoading}
                >
                  All
                </Button>
                <Button
                  variant={genderFilter === 'MALE' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => handleGenderFilterChange('MALE')}
                  disabled={imageLoading}
                >
                  Male
                </Button>
                <Button
                  variant={genderFilter === 'FEMALE' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => handleGenderFilterChange('FEMALE')}
                  disabled={imageLoading}
                >
                  Female
                </Button>
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Filter character types or choose "All" for random
              </p>
            </div>

            {/* Character Display */}
            <div>
              <label className='text-sm font-medium mb-2 block'>
                Character Appearance {currentGender && `(${currentGender.toLowerCase()})`}
              </label>

              {generatedImage ? (
                <div className='space-y-2'>
                  <img
                    src={generatedImage}
                    alt={`Generated ${currentGender.toLowerCase()} character`}
                    className='w-64 h-64 rounded border'
                  />
                  <div className="flex gap-2">
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={generateCharacterImage}
                      disabled={imageLoading}
                      className="flex-1"
                    >
                      {imageLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          New Look
                        </>
                      )}
                    </Button>

                    {/* Quick gender swap */}
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        const newGender = currentGender === 'MALE' ? 'FEMALE' : 'MALE'
                        setGenderFilter(newGender)
                      }}
                      disabled={imageLoading}
                      title="Switch gender"
                    >
                      ♂♀
                    </Button>
                  </div>
                </div>
              ) : (
                <div className='w-64 h-64 rounded border flex items-center justify-center bg-muted'>
                  {imageLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm text-muted-foreground">Generating...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">No character yet</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dev Mode Shortcuts */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded border-l-4 border-orange-400">
                <div className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-2">
                  🛠️ Dev Shortcuts
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Skip payment entirely in dev
                      const fakeSignature = 'dev-mode-' + Date.now()
                      createCharacterWithPayment(fakeSignature)
                    }}
                    disabled={loading || !generatedImage}
                    className="text-xs"
                  >
                    Skip Payment
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Generate multiple characters rapidly
                      for (let i = 0; i < 30; i++) {
                        setTimeout(() => generateCharacterImage(), i * 500)
                      }
                    }}
                    disabled={imageLoading}
                    className="text-xs"
                  >
                    30x Generate
                  </Button>
                </div>
              </div>
            )}

            {/* Create Character Button */}
            <Button
              onClick={handleStartCreation}
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
                'Pay 0.01 SOL & Create Character'
              )}
            </Button>

            {!generatedImage && !imageLoading && (
              <p className='text-sm text-muted-foreground text-center'>
                Character will generate automatically
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
          <div className='space-y-4'>
            <div className='flex items-center gap-4'>
              {character.currentImageUrl && (
                <img
                  src={character.currentImageUrl}
                  alt={character.name}
                  className='w-48 h-48 rounded border'
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
