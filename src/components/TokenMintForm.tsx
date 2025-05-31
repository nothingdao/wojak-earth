// components/TokenMintForm.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Coins, Plus, Minus } from 'lucide-react'
import { useTokenMinter } from '@/hooks/useTokenMinter'
import { toast } from 'sonner'

interface TokenMetadata {
  name: string
  symbol: string
  description: string
  image?: string
  decimals: number
  initialSupply: number
  // Additional metadata fields
  website?: string
  twitter?: string
  telegram?: string
  discord?: string
}

export const TokenMintForm: React.FC = () => {
  const { mintToken, connected, minting } = useTokenMinter()
  const [formData, setFormData] = useState<TokenMetadata>({
    name: '',
    symbol: '',
    description: '',
    image: '',
    decimals: 6,
    initialSupply: 1000000,
    website: '',
    twitter: '',
    telegram: '',
    discord: ''
  })

  const handleInputChange = (field: keyof TokenMetadata, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.symbol) {
      toast.error('Name and symbol are required')
      return
    }

    if (!connected) {
      toast.error('Please connect your wallet first')
      return
    }

    try {
      const result = await mintToken(formData)
      if (result) {
        toast.success(`${formData.name} token created successfully!`)
        // Reset form
        setFormData({
          name: '',
          symbol: '',
          description: '',
          image: '',
          decimals: 6,
          initialSupply: 1000000,
          website: '',
          twitter: '',
          telegram: '',
          discord: ''
        })
      }
    } catch (error) {
      console.error('Token creation failed:', error)
      toast.error('Failed to create token')
    }
  }

  const adjustSupply = (increment: boolean) => {
    const multiplier = increment ? 10 : 0.1
    const newSupply = Math.max(1, Math.floor(formData.initialSupply * multiplier))
    handleInputChange('initialSupply', newSupply)
  }

  const adjustDecimals = (increment: boolean) => {
    const newDecimals = increment
      ? Math.min(9, formData.decimals + 1)
      : Math.max(0, formData.decimals - 1)
    handleInputChange('decimals', newDecimals)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Create Your Token
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Token Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Wojak Earth Token"
                required
              />
            </div>

            <div>
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => handleInputChange('symbol', e.target.value.toUpperCase())}
                placeholder="e.g., WET"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your token..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => handleInputChange('image', e.target.value)}
              placeholder="https://example.com/token-image.png"
              type="url"
            />
          </div>

          {/* Token Economics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Decimals</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustDecimals(false)}
                  disabled={formData.decimals <= 0}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Input
                  value={formData.decimals}
                  onChange={(e) => handleInputChange('decimals', parseInt(e.target.value) || 0)}
                  className="text-center"
                  type="number"
                  min="0"
                  max="9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustDecimals(true)}
                  disabled={formData.decimals >= 9}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                How many decimal places (0-9)
              </p>
            </div>

            <div>
              <Label>Initial Supply</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustSupply(false)}
                  disabled={formData.initialSupply <= 1}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Input
                  value={formData.initialSupply.toLocaleString()}
                  onChange={(e) => {
                    const num = parseInt(e.target.value.replace(/,/g, '')) || 0
                    handleInputChange('initialSupply', num)
                  }}
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustSupply(true)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total tokens to mint initially
              </p>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <Label>Social Links (Optional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="Website URL"
                type="url"
              />
              <Input
                value={formData.twitter || ''}
                onChange={(e) => handleInputChange('twitter', e.target.value)}
                placeholder="Twitter handle"
              />
              <Input
                value={formData.telegram || ''}
                onChange={(e) => handleInputChange('telegram', e.target.value)}
                placeholder="Telegram link"
              />
              <Input
                value={formData.discord || ''}
                onChange={(e) => handleInputChange('discord', e.target.value)}
                placeholder="Discord link"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={!connected || minting || !formData.name || !formData.symbol}
          >
            {minting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating Token...
              </>
            ) : (
              <>
                <Coins className="w-4 h-4 mr-2" />
                Create Token
              </>
            )}
          </Button>

          {!connected && (
            <p className="text-center text-sm text-muted-foreground">
              Connect your wallet to create tokens
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
