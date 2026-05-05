// src/utils/asset-loader.ts - FIXED VERSION
class AssetLoader {
  private manifestCache: any = null

  // Load the main manifest once and cache it
  async getMainManifest(): Promise<any> {
    if (this.manifestCache) return this.manifestCache

    try {
      const response = await fetch('/layers/manifest.json')
      if (response.ok) {
        this.manifestCache = await response.json()
        return this.manifestCache
      }
      throw new Error('Failed to load manifest')
    } catch (error) {
      console.error('Failed to load manifest:', error)
      return {}
    }
  }

  // Get assets for a layer and gender - SIMPLE VERSION
  async getLayerAssets(layerType: string, gender: string): Promise<string[]> {
    const manifest = await this.getMainManifest()
    const layerData = manifest[layerType]

    if (!layerData || !layerData[gender]) {
      return []
    }

    // Handle both string arrays and object arrays
    return layerData[gender]
      .map((entry: any) => {
        if (typeof entry === 'string') return entry
        if (typeof entry === 'object' && entry.file) return entry.file
        return null
      })
      .filter(Boolean)
  }

  // Get random asset - SIMPLE VERSION
  async getRandomAsset(
    layerType: string,
    gender: string
  ): Promise<string | null> {
    const assets = await this.getLayerAssets(layerType, gender)
    if (assets.length === 0) return null
    return assets[Math.floor(Math.random() * assets.length)]
  }

  // Clear cache
  clearCache() {
    this.manifestCache = null
  }

  // Add back the missing function
  async preloadCriticalLayers() {
    // Just preload the manifest
    await this.getMainManifest()
  }
}

// Singleton
export const assetLoader = new AssetLoader()

// Simple exports
export const getLayerAssets = (layerType: string, gender: string) =>
  assetLoader.getLayerAssets(layerType, gender)

export const getRandomAsset = (layerType: string, gender: string) =>
  assetLoader.getRandomAsset(layerType, gender)
