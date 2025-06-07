// src/components/views/SandboxView.tsx
import React, { useState, useRef, useEffect } from 'react'
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
import SolanaPayment from '@/components/SolanaPayment'
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
  [layerType: string]: LayerManifest
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

export const SandboxView: React.FC<SandboxViewProps> = ({ character, onCharacterCreated }) => {
  const walletInfo = useWalletInfo()
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)
  const [selectedLayers, setSelectedLayers] = useState<Record<string, string | null> | null>(null)

  const [genderFilter, setGenderFilter] = useState<GenderFilter>('ALL')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [currentGender, setCurrentGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 💰 Payment state variables
  const [showPayment, setShowPayment] = useState(false)

  // Auto-generate character on component mount
  useEffect(() => {
    if (walletInfo.connected && !character) {
      generateCharacterImage()
    }
  }, [walletInfo.connected, character])

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

  // Parse asset entry (can be string or object with compatibility rules)
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
    const layerData = manifest[layerType]
    if (!layerData) return []

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

    // Add neutral assets (work for all genders)
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

  // Check if two assets are compatible based on manifest rules
  const areAssetsCompatible = (manifest: Manifest, selectedLayers: Record<string, string | null>): boolean => {
    const rules = manifest.compatibility_rules || {}

    // Check hair-headwear conflicts
    const selectedHair = selectedLayers['6-hair']
    const selectedHeadwear = selectedLayers['8-headwear']

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

    // Check outerwear-headwear combinations
    const selectedOuterwear = selectedLayers['5-outerwear']
    if (selectedOuterwear && selectedHeadwear && rules.outerwear_combinations) {
      const outerwearRules = rules.outerwear_combinations[selectedOuterwear]
      if (outerwearRules) {
        if (outerwearRules.blocks_headwear && outerwearRules.blocks_headwear.includes(selectedHeadwear)) {
          return false
        }
        if (outerwearRules.allows_headwear && !outerwearRules.allows_headwear.includes(selectedHeadwear)) {
          return false
        }
      }
    }

    return true
  }

  // Get compatible assets for a layer considering already selected items
  const getCompatibleAssets = (manifest: Manifest, layerType: string, selectedLayers: Record<string, string | null>, gender: 'MALE' | 'FEMALE'): string[] => {
    const layerAssets = getLayerAssets(manifest, layerType, gender)
    const compatibleAssets: string[] = []

    for (const asset of layerAssets) {
      // Create temporary selection to test compatibility
      const testSelection = { ...selectedLayers, [layerType]: asset }

      if (areAssetsCompatible(manifest, testSelection)) {
        compatibleAssets.push(asset)
      }
    }

    return compatibleAssets
  }

  // Generate random character image using proper layer system
  // Modified character generation function to track selected layers
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
      ctx.clearRect(0, 0, 400, 400)

      // Determine gender for this generation
      let selectedGender: 'MALE' | 'FEMALE'
      if (genderFilter === 'ALL') {
        selectedGender = Math.random() < 0.5 ? 'MALE' : 'FEMALE'
      } else {
        selectedGender = genderFilter
      }
      setCurrentGender(selectedGender)

      // Load manifest
      const manifest = await loadLayersManifest()
      console.log('Loaded manifest:', manifest)

      // Select layers based on probability, requirements, and compatibility
      const selectedLayers: Record<string, string | null> = {}

      // First pass: select required layers without compatibility checking
      for (const [layerType, config] of Object.entries(LAYER_CONFIG)) {
        if (config.required) {
          const availableAssets = getLayerAssets(manifest, layerType, selectedGender)
          if (availableAssets.length > 0) {
            selectedLayers[layerType] = availableAssets[Math.floor(Math.random() * availableAssets.length)]
          }
        }
      }

      // Second pass: select optional layers with compatibility checking
      for (const [layerType, config] of Object.entries(LAYER_CONFIG)) {
        if (!config.required && Math.random() < config.probability) {
          const compatibleAssets = getCompatibleAssets(manifest, layerType, selectedLayers, selectedGender)
          if (compatibleAssets.length > 0) {
            selectedLayers[layerType] = compatibleAssets[Math.floor(Math.random() * compatibleAssets.length)]
          }
        }

        // Set null for layers not selected
        if (!selectedLayers[layerType]) {
          selectedLayers[layerType] = null
        }
      }

      console.log('Selected layers for', selectedGender + ':', selectedLayers)

      // STORE SELECTED LAYERS FOR INVENTORY CREATION
      setSelectedLayers(selectedLayers) // Add this state variable

      // Load image helper
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = reject
          img.src = src
        })
      }

      // Draw layers in proper order
      const layerOrder = Object.keys(LAYER_CONFIG)

      for (const layerType of layerOrder) {
        const selectedFile = selectedLayers[layerType]
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
  }


  // Handle gender filter change
  const handleGenderFilterChange = (newFilter: GenderFilter) => {
    setGenderFilter(newFilter)
    generateCharacterImage()
  }

  // Handle payment verification and start character creation
  const handleStartCreation = () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Connect wallet first')
      return
    }

    if (!generatedImage) {
      toast.error('Generate character image first')
      return
    }

    // Show payment component
    setShowPayment(true)
  }

  // Handle payment verified - proceed with minting
  const handlePaymentVerified = (verifiedPaymentId: string) => {
    setShowPayment(false)
    // Now proceed with character creation using the paymentId
    createCharacterWithPayment(verifiedPaymentId)
  }

  // Handle payment cancelled
  const handlePaymentCancelled = () => {
    setShowPayment(false)
    toast.info('Character creation cancelled')
  }

  // Create character with verified payment
  const createCharacterWithPayment = async (verifiedPaymentId: string) => {
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
          paymentId: verifiedPaymentId // 🆔 Include verified payment ID
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Character created! ${result.character.name}`)
        console.log('Character:', result.character)
        console.log('NFT Address:', result.nftAddress)
        console.log('Image URL:', result.imageUrl)
        console.log('Metadata URI:', result.metadataUri)

        setGeneratedImage(null)
        setSelectedLayers(null)

        // Auto-generate a new character after successful creation
        generateCharacterImage()

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

  return (
    <div className='space-y-6'>
      {/* 💰 Solana Payment Modal */}
      {showPayment && (
        <SolanaPayment
          characterData={{
            gender: currentGender,
            selectedLayers: selectedLayers
          }}
          onPaymentVerified={handlePaymentVerified}
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
                        Generate Another
                      </>
                    )}
                  </Button>
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
                'Pay 2 SOL & Create Character'
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
