// src/components/views/MarketView.tsx - LAYOUT FIXED VERSION
import { Button } from '@/components/ui/button'
import { Store, Coins, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  // Remove useState for activeTab since Tabs component handles it internally

  // Determine if we're at a child location (has parent location)
  const currentLoc = selectedLocation || character?.currentLocation

  // Filter market items by tab
  const localItems = marketItems.filter(item => item.isLocalSpecialty || false)
  const globalItems = marketItems.filter(item => !item.isLocalSpecialty)
  const p2pItems: MarketItem[] = [] // Placeholder - will be player-listed items

  const renderMarketItem = (marketItem: MarketItem) => {
    const isLoading = loadingItems.has(marketItem.id)
    const canAfford = character.coins >= marketItem.price
    const canBuy = marketItem.quantity > 0 && canAfford && !isLoading

    return (
      <div key={marketItem.id} className="w-full">
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"> {/* Change items-center to items-start */}
          {/* Icon */}
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-sm flex-shrink-0">
            {marketItem.item.category === 'HAT' ? '🎩' :
              marketItem.item.category === 'CONSUMABLE' ? '🥤' :
                marketItem.isLocalSpecialty ? '✨' : '📦'}
          </div>

          {/* Item Details - Allow this to grow and shrink */}
          <div className="flex-1 min-w-0"> {/* Remove overflow-hidden */}
            <div className="font-medium flex items-center gap-2 mb-1 flex-wrap"> {/* Add flex-wrap */}
              <span className="truncate">{marketItem.item.name}</span>
              {marketItem.isLocalSpecialty && (
                <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  Local
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground mb-1 break-words"> {/* Change truncate to break-words */}
              {marketItem.item.description}
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {marketItem.item.rarity} • Sold by {marketItem.isSystemItem ? 'System' : marketItem.seller?.name}
            </div>
          </div>

          {/* Price and Purchase Section - Fixed width */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[80px]"> {/* Change w-20 to min-w-[80px] */}
            {/* Price */}
            <div className={`font-bold flex items-center gap-1 text-sm ${!canAfford && marketItem.quantity > 0 ? 'text-red-500' : ''}`}>
              <Coins className="w-3 h-3" />
              <span>{marketItem.price}</span> {/* Remove truncate */}
            </div>

            {/* Quantity */}
            <div className="text-xs text-muted-foreground text-center">
              Qty: {marketItem.quantity > 0 ? marketItem.quantity : 'Out'}
            </div>

            {/* Error Message */}
            {!canAfford && marketItem.quantity > 0 && (
              <div className="text-xs text-red-500 text-center leading-tight"> {/* Add leading-tight */}
                Need {marketItem.price - character.coins} more
              </div>
            )}

            {/* Buy Button */}
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onPurchase(marketItem.id, marketItem.price, marketItem.item.name)
              }}
              disabled={!canBuy}
              className="text-xs w-full h-7"
              title={
                marketItem.quantity === 0 ? 'Out of stock' :
                  !canAfford ? `Need ${marketItem.price - character.coins} more coins` :
                    'Purchase this item'
              }
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : marketItem.quantity === 0 ? 'Out' :
                !canAfford ? 'Poor' : 'Buy'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Market - {currentLoc?.name}</h3>
        <div className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-1">
          <Coins className="w-4 h-4" />
          <span>You have {character.coins} coins</span>
        </div>
      </div>

      {/* Compact Shadcn Tabs */}
      <Tabs defaultValue="local" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="local" className="text-xs">
            Local
            {localItems.length > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1 rounded">
                {localItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="global" className="text-xs">
            Global
            {globalItems.length > 0 && (
              <span className="ml-1 text-xs bg-muted-foreground/20 px-1 rounded">
                {globalItems.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="p2p" className="text-xs">
            P2P
            <span className="ml-1 text-xs opacity-50">(Soon)</span>
          </TabsTrigger>
        </TabsList>

        {/* Local Tab Content */}
        <TabsContent value="local" className="mt-4">
          <div className="h-[400px] w-full border rounded-lg">
            <ScrollArea className="h-full w-full p-2">
              <div className="space-y-3">
                {localItems.length > 0 ? (
                  localItems.map(renderMarketItem)
                ) : (
                  <div className="bg-muted/30 p-8 rounded-lg text-center text-muted-foreground">
                    <Store className="w-12 h-12 mx-auto mb-2" />
                    No local specialties available.<br />
                    <span className="text-xs">These are unique items specific to this location.</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Global Tab Content */}
        <TabsContent value="global" className="mt-4">
          <div className="h-[400px] w-full border rounded-lg">
            <ScrollArea className="h-full w-full p-2">
              <div className="space-y-3">
                {globalItems.length > 0 ? (
                  globalItems.map(renderMarketItem)
                ) : (
                  <div className="bg-muted/30 p-8 rounded-lg text-center text-muted-foreground">
                    <Store className="w-12 h-12 mx-auto mb-2" />
                    No items available in the global market.<br />
                    <span className="text-xs">Check back later as merchants restock.</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* P2P Tab Content */}
        <TabsContent value="p2p" className="mt-4">
          <div className="h-[400px] w-full border rounded-lg">
            <ScrollArea className="h-full w-full p-2">
              <div className="space-y-3">
                <div className="bg-muted/30 p-8 rounded-lg text-center text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-2" />
                  Player Market Coming Soon!<br />
                  <span className="text-xs">Players will be able to list items from their inventory in local markets.</span>
                </div>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
