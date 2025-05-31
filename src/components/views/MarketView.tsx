// src/components/views/MarketView.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Store, Coins, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Character, Location, MarketItem } from '@/types'

interface MarketViewProps {
  character: Character
  selectedLocation: Location | null
  locations: Location[]
  marketItems: MarketItem[]
  loadingItems: Set<string>
  onPurchase: (marketListingId: string, price: number, itemName: string) => void
}

export function MarketView({
  character,
  selectedLocation,
  locations,
  marketItems,
  loadingItems,
  onPurchase
}: MarketViewProps) {
  const [activeTab, setActiveTab] = useState<'local' | 'global'>('local')

  // Determine if we're at a child location (has parent location)
  const currentLoc = selectedLocation || character?.currentLocation
  const isChildLocation = currentLoc && locations.find(loc =>
    loc.subLocations?.some(sub => sub.id === currentLoc.id)
  )

  // Filter market items by tab
  const localItems = marketItems.filter(item => item.isLocalSpecialty || false)
  const globalItems = marketItems.filter(item => !item.isLocalSpecialty)

  const activeItems = activeTab === 'local' ? localItems : globalItems

  const renderMarketItem = (marketItem: MarketItem) => {
    const isLoading = loadingItems.has(marketItem.id)

    return (
      <div key={marketItem.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-sm flex-shrink-0">
            {marketItem.item.category === 'HAT' ? '🎩' :
              marketItem.item.category === 'CONSUMABLE' ? '🥤' :
                marketItem.isLocalSpecialty ? '✨' : '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium flex items-center gap-2">
              <span className="truncate">{marketItem.item.name}</span>
              {marketItem.isLocalSpecialty && (
                <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  Local
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground truncate">{marketItem.item.description}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {marketItem.item.rarity} • Sold by {marketItem.isSystemItem ? 'System' : marketItem.seller?.name}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="font-bold flex items-center gap-1 justify-end">
            <Coins className="w-3 h-3" />
            {marketItem.price}
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            Qty: {marketItem.quantity > 0 ? marketItem.quantity : 'Out of Stock'}
          </div>
          <Button
            size="sm"
            onClick={() => onPurchase(marketItem.id, marketItem.price, marketItem.item.name)}
            disabled={marketItem.quantity === 0 || isLoading}
            className="text-xs"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : marketItem.quantity > 0 ? 'Buy' : 'Sold Out'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-full">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Market - {currentLoc?.name}</h3>
        {isChildLocation && (
          <p className="text-xs text-muted-foreground">
            Unique local items + supplies from the main settlement
          </p>
        )}
      </div>

      {/* Tab Navigation - only show if child location */}
      {isChildLocation && (
        <div className="flex border-b">
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'local'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            onClick={() => setActiveTab('local')}
          >
            Local Specialties
            {localItems.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {localItems.length}
              </span>
            )}
          </button>
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'global'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            onClick={() => setActiveTab('global')}
          >
            Global Market
            {globalItems.length > 0 && (
              <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {globalItems.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Market Items - Scrollable Container */}
      <ScrollArea className="h-96">
        <div className="space-y-2">
          {activeItems.length > 0 ? (
            activeItems.map(renderMarketItem)
          ) : (
            <div className="bg-muted/30 p-8 rounded-lg text-center text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-2" />
              {activeTab === 'local' ? (
                <>
                  No local specialties available.<br />
                  Check back later or try the global market.
                </>
              ) : (
                <>
                  No items available in the global market.<br />
                  The merchants might be restocking.
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
