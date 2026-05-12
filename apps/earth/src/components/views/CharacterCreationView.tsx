// src/components/views/CharacterCreationView.tsx - Updated with asset loader
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  Loader2,
  User,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Shuffle,
  Users,
  Coins
} from 'lucide-react'
import { useWalletInfo } from '@/hooks/useWalletInfo'
import { useWallet } from '@solana/wallet-adapter-react'
import { toast } from '@/components/ui/use-toast'
import SimplePayment, { type EarthVaultCharacterPaymentResult } from '@/components/SimplePayment'
import type { Character, Enums } from '@/types'
import { SERVER_URL } from '@/config/functionsBase'
// ✅ NEW: Import the clean asset loader API
import {
  assetLoader,
  getLayerAssets,
  getRandomAsset,
} from '@/utils/asset-loader'

// ✅ MOVED: Layer config belongs in the UI, not the API
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
} as const

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
] as const

interface CharacterCreationViewProps {
  character: Character | null
  onCharacterCreated?: () => void
}

type GenderFilter = 'ALL' | 'MALE' | 'FEMALE'

export const CharacterCreationView: React.FC<CharacterCreationViewProps> = ({ character, onCharacterCreated }) => {
  const walletInfo = useWalletInfo()
  const wallet = useWallet()
  const [selectedLayers, setSelectedLayers] = useState<Record<string, string | null> | null>(null)

  // State with proper defaults
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('MALE')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [currentGender, setCurrentGender] = useState<'MALE' | 'FEMALE'>('MALE')
  const [assetError, setAssetError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Payment state
  const [showPayment, setShowPayment] = useState(false)
  const [creatingCharacter, setCreatingCharacter] = useState(false)
  const [paidSignature, setPaidSignature] = useState<string | null>(null)
  const [paidVaultReceipt, setPaidVaultReceipt] = useState<EarthVaultCharacterPaymentResult | null>(null)
  const [creationError, setCreationError] = useState<string | null>(null)

  // ✅ SIMPLIFIED: Generate character image with asset loader
  const generateCharacterImage = useCallback(async () => {
    if (imageLoading) return // Prevent multiple simultaneous generations

    setImageLoading(true)
    setGeneratedImage(null) // Clear previous image
    setShowPayment(false) // Ensure payment modal is closed
    setAssetError(null)

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
      let selectedGender: Enums<'Gender'>
      if (genderFilter === 'ALL') {
        selectedGender = Math.random() < 0.5 ? 'MALE' : 'FEMALE'
      } else {
        selectedGender = genderFilter as Enums<'Gender'>
      }

      setCurrentGender(selectedGender)
      console.log('🎯 Generating character:', selectedGender)

      // ✅ NEW: Use asset loader to generate layers with compatibility
      const newSelectedLayers: Record<string, string | null> = {}
      let retryCount = 0
      const maxRetries = 5

      while (retryCount < maxRetries) {
        try {
          // Reset layers
          Object.keys(LAYER_CONFIG).forEach(layer => {
            newSelectedLayers[layer] = null
          })

          // ✅ FIXED: Only use layers that actually exist in your manifest
          const actualLayers = ['1-base', '4-clothing', '5-outerwear', '6-hair', '8-headwear', '9-misc-accessories', 'backgrounds']
          const currentAssets: Array<{ layerType: string; filename: string }> = []

          // Always add required layers
          for (const layer_type of ['1-base', '6-hair', 'backgrounds']) {
            if (actualLayers.includes(layer_type)) {
              const asset = await getRandomAsset(layer_type, selectedGender.toLowerCase())
              if (asset) {
                newSelectedLayers[layer_type] = asset
                currentAssets.push({ layerType: layer_type, filename: asset })
                console.log(`✓ Selected required: ${layer_type}/${asset}`)
              }
            }
          }

          // Add optional layers with probability
          const optionalLayers = {
            '4-clothing': 0.8,
            '5-outerwear': 0.6,
            '8-headwear': 0.4,
            '9-misc-accessories': 0.2
          }

          for (const [layer_type, probability] of Object.entries(optionalLayers)) {
            if (actualLayers.includes(layer_type) && Math.random() < probability) {
              console.log(`🎲 Trying to get ${layer_type} asset...`)
              const availableAssets = await getLayerAssets(layer_type, selectedGender.toLowerCase())
              console.log(`📦 Available ${layer_type} assets:`, availableAssets)

              const asset = await getRandomAsset(layer_type, selectedGender.toLowerCase())
              if (asset) {
                newSelectedLayers[layer_type] = asset
                currentAssets.push({ layerType: layer_type, filename: asset })
                console.log(`✓ Selected optional: ${layer_type}/${asset}`)
              } else {
                console.log(`❌ No asset returned for ${layer_type}`)
              }
            } else {
              console.log(`⏭️ Skipped ${layer_type} (probability: ${probability}, rolled: ${Math.random()})`)
            }
          }

          // Success - we have a valid combination
          break

        } catch (error) {
          console.warn(`❌ Layer selection error (retry ${retryCount}):`, error)
          retryCount++
        }
      }

      if (retryCount >= maxRetries) {
        console.warn('⚠️ Max retries reached, using current selection anyway')
      }

      setSelectedLayers(newSelectedLayers)

      // Load and draw images
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
          img.src = src

          // Add timeout to prevent hanging
          setTimeout(() => {
            if (!img.complete) {
              reject(new Error(`Image load timeout: ${src}`))
            }
          }, 10000) // 10 second timeout
        })
      }

      let successfulLayers = 0

      for (const layer_type of LAYER_ORDER) {
        const selectedFile = newSelectedLayers[layer_type]
        if (!selectedFile) continue

        try {
          const img = await loadImage(`/layers/${layer_type}/${selectedFile}`)
          ctx.drawImage(img, 0, 0, 400, 400)
          successfulLayers++
          console.log(`✓ Loaded: ${layer_type}/${selectedFile}`)
        } catch (error) {
          console.warn(`✗ Failed to load layer: ${layer_type}/${selectedFile}`, error)
          // Don't fail the entire generation for one missing layer
        }
      }

      if (successfulLayers === 0) {
        throw new Error('No layers could be loaded')
      }

      // Convert to base64
      const imageDataUrl = canvas.toDataURL('image/png', 0.9)
      setGeneratedImage(imageDataUrl)

    } catch (error) {
      console.error('Image generation failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (!errorMessage.includes('Canvas not available')) {
        setAssetError(errorMessage)
        toast.error(`Failed to generate character: ${errorMessage}`)
      }
      setGeneratedImage(null)
      setSelectedLayers(null)
    } finally {
      setImageLoading(false)
    }
  }, [genderFilter, imageLoading])

  // Handle gender filter change
  const handleGenderFilterChange = (newFilter: GenderFilter) => {
    if (imageLoading) return // Prevent change during generation
    setGenderFilter(newFilter)
  }

  // Handle payment success
  const handlePaymentSuccess = (payment: EarthVaultCharacterPaymentResult) => {
    setPaidSignature(payment.signature)
    setPaidVaultReceipt(payment)
    setCreationError(null)
    setShowPayment(false)
    setCreatingCharacter(true)
    createCharacterWithPayment(payment)
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

    if (imageLoading) {
      toast.error('Please wait for character generation to complete')
      return
    }

    if (!generatedImage) {
      toast.error('Generate character image first')
      return
    }

    if (!selectedLayers) {
      toast.error('Character data not ready')
      return
    }

    setShowPayment(true)
  }

  // Create character with payment
  const createCharacterWithPayment = async (payment: EarthVaultCharacterPaymentResult) => {
    if (!wallet.publicKey || !generatedImage || !selectedLayers) {
      toast.error('Missing required data for character creation')
      return
    }

    try {
      console.log('🎨 Creating character with payment:', {
        wallet: wallet.publicKey.toString(),
        gender: currentGender,
        layersCount: Object.values(selectedLayers).filter(Boolean).length,
        paymentSignature: payment.signature,
        earthVaultReceipt: payment.receiptAddress
      })

      const response = await fetch(`${SERVER_URL}/earth/mint-player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: wallet.publicKey.toString(),
          gender: currentGender,
          imageBlob: generatedImage,
          selectedLayers: selectedLayers,
          paymentSignature: payment.signature,
          earthVaultReceiptId: payment.receiptId,
          earthVaultReceiptAddress: payment.receiptAddress,
          isNPC: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server error (${response.status}): ${errorText}`)
      }

      const result = await response.json()

      if (result.success) {
        toast.success(`${result.character.name} created successfully! 🎉`)

        // Clear state for next character
        setGeneratedImage(null)
        setSelectedLayers(null)
        setShowPayment(false)
        setCreatingCharacter(false)
        setPaidSignature(null)
        setPaidVaultReceipt(null)
        setCreationError(null)

        // Navigate to main app
        if (onCharacterCreated) {
          onCharacterCreated()
        }

        // Auto-generate new character for testing
        if (process.env.NODE_ENV === 'development') {
          setTimeout(() => {
            generateCharacterImage()
          }, 2000)
        }
      } else {
        throw new Error(result.error || 'Character creation failed')
      }

    } catch (error: unknown) {
      console.error('Character creation failed:', error)

      // Check if wallet already has character
      if (error instanceof Error && (error.message?.includes('WALLET_HAS_PLAYER') || error.message?.includes('Wallet already has a character'))) {
        console.log('🎉 Wallet already has a character, proceeding to game...')

        setCreatingCharacter(false)
        setShowPayment(false)
        toast.success('Character already exists! Entering game...')

        if (onCharacterCreated) {
          onCharacterCreated()
        }

        return
      }

      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setCreationError(errorMessage)
      toast.error(`Creation failed: ${errorMessage}`)
      setCreatingCharacter(false)
    }
  }

  // ✅ SIMPLIFIED: Auto-generate on mount
  useEffect(() => {
    if (walletInfo.connected && !character && !imageLoading && !generatedImage) {
      const timer = setTimeout(() => {
        generateCharacterImage()
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [walletInfo.connected, character, genderFilter, generateCharacterImage])

  // ✅ NEW: Preload critical assets
  useEffect(() => {
    assetLoader.preloadCriticalLayers().catch(console.warn)
  }, [])

  return (
    <div className="space-y-4">
      {/* Simple Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <SimplePayment
            characterData={{
              gender: currentGender,
              selectedLayers: selectedLayers
            }}
            onPaymentSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancelled}
          />
        </div>
      )}

      {creationError && paidSignature && !creatingCharacter && (
        <div className="bg-muted/20 border border-error/30 rounded p-3">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="w-4 h-4" />
            <span className="font-mono text-sm">CREATION_FAILED_AFTER_PAYMENT</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono break-words">
            {creationError}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!paidVaultReceipt) {
                toast.error('No Earth Vault receipt available for retry')
                return
              }
              setCreationError(null)
              setCreatingCharacter(true)
              createCharacterWithPayment(paidVaultReceipt)
            }}
            className="mt-2 h-7 text-xs font-mono"
          >
            RETRY_WITH_SAME_RECEIPT
          </Button>
        </div>
      )}

      {/* ✅ UPDATED: Asset Error State */}
      {assetError && (
        <div className="bg-muted/20 border border-error/30 rounded p-3">
          <div className="flex items-center gap-2 text-error">
            <AlertCircle className="w-4 h-4" />
            <span className="font-mono text-sm">ASSET_LOADING_ERROR</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {assetError}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAssetError(null)
              assetLoader.clearCache()
              generateCharacterImage()
            }}
            className="mt-2 h-7 text-xs font-mono"
          >
            RETRY_GENERATION
          </Button>
        </div>
      )}

      {/* Character Creation In Progress */}
      {creatingCharacter && (
        <div className="bg-muted/20 border border-success/30 rounded p-4">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto mb-3 bg-muted/30 rounded border flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-success" />
            </div>
            <h3 className="text-success font-mono font-bold">
              CREATING_CHARACTER
            </h3>
            <p className="text-muted-foreground text-xs font-mono">
              PAYMENT_CONFIRMED | MINTING_NFT...
            </p>

            {generatedImage && (
              <div className="flex justify-center mt-3">
                <img
                  src={generatedImage}
                  alt={`Your ${currentGender.toLowerCase()} character`}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded border-2 border-success/30"
                />
              </div>
            )}

            <div className="space-y-1 text-xs font-mono">
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle className="w-3 h-3" />
                <span>PAYMENT_VERIFIED</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-warning">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>MINTING_NFT...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Character Creation */}
      {walletInfo.connected && !character && !showPayment && !creatingCharacter && (
        <div className="space-y-4">
          {/* Gender Filter Row */}
          <div className="bg-muted/20 border border-primary/20 rounded p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-primary font-mono text-sm font-bold">CHAR_TYPE</div>

              {/* Button Group */}
              <div className="flex border border-primary/30 rounded overflow-hidden">
                <Button
                  variant={genderFilter === 'ALL' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleGenderFilterChange('ALL')}
                  disabled={imageLoading}
                  className={`h-7 px-3 text-xs font-mono rounded-none border-0 ${genderFilter === 'ALL'
                    ? 'bg-success text-black'
                    : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                >
                  <Shuffle className="w-3 h-3 mr-1" />
                  ALL
                </Button>
                <div className="w-px bg-primary/30" />
                <Button
                  variant={genderFilter === 'MALE' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleGenderFilterChange('MALE')}
                  disabled={imageLoading}
                  className={`h-7 px-3 text-xs font-mono rounded-none border-0 ${genderFilter === 'MALE'
                    ? 'bg-success text-black'
                    : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                >
                  <User className="w-3 h-3 mr-1" />
                  MALE
                </Button>
                <div className="w-px bg-primary/30" />
                <Button
                  variant={genderFilter === 'FEMALE' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleGenderFilterChange('FEMALE')}
                  disabled={imageLoading}
                  className={`h-7 px-3 text-xs font-mono rounded-none border-0 ${genderFilter === 'FEMALE'
                    ? 'bg-success text-black'
                    : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                >
                  <Users className="w-3 h-3 mr-1" />
                  FEMALE
                </Button>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={generateCharacterImage}
                disabled={imageLoading}
                className="h-7 w-7 p-0 border-success/50 text-success hover:bg-success/10"
              >
                {imageLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Character Display */}
          <div className="bg-muted/20 border border-primary/20 rounded p-4">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded border-2 border-primary/30 bg-muted/10 flex items-center justify-center relative overflow-hidden">
                  {generatedImage ? (
                    <img
                      src={generatedImage}
                      alt={`Generated ${currentGender.toLowerCase()} character`}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : imageLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-success" />
                      <div className="text-center">
                        <p className="font-mono text-sm text-success">GENERATING...</p>
                        <p className="text-xs text-muted-foreground font-mono">CREATING_CHARACTER</p>
                      </div>
                    </div>
                  ) : assetError ? (
                    <div className="flex flex-col items-center gap-2 text-error">
                      <AlertCircle className="w-6 h-6" />
                      <span className="text-xs font-mono">GENERATION_FAILED</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono">NO_CHARACTER_YET</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Character Info */}
              {generatedImage && (
                <div className="text-center">
                  <div className="text-success font-mono text-sm font-bold">
                    {currentGender}_CHARACTER_READY
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    LAYERS_LOADED | READY_FOR_MINT
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Create Character Section */}
          <div className="bg-muted/20 border border-primary/20 rounded p-4 space-y-3">
            <div className="text-center">
              <div className="text-warning font-mono text-lg font-bold mb-1">0.5_SOL</div>
              <div className="text-xs text-muted-foreground font-mono">(DEVNET_TESTING)</div>
            </div>

            <Button
              onClick={handleStartCreation}
              disabled={!generatedImage || assetError !== null || imageLoading}
              className="w-full bg-success hover:bg-success/90 text-black font-mono text-sm h-9"
              size="lg"
            >
              <Coins className="w-4 h-4 mr-2" />
              MAKE_PAYMENT
            </Button>

            {/* Status Message */}
            <div className="h-4 flex items-center justify-center">
              {assetError && (
                <p className="text-xs text-error text-center font-mono">
                  CANNOT_CREATE_UNTIL_GENERATION_FIXED
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wallet not connected state */}
      {!walletInfo.connected && (
        <div className="bg-muted/20 border border-primary/20 rounded p-4 text-center space-y-3">
          <h3 className="text-primary font-mono font-bold">CONNECT_WALLET</h3>
          <p className="text-muted-foreground text-sm font-mono">
            SOLANA_WALLET_REQUIRED_FOR_CHARACTER_CREATION
          </p>
        </div>
      )}

      {/* Hidden canvas for image generation */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />
    </div>
  )
}
