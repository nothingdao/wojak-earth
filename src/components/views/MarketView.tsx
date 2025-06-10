import { Button } from '@/components/ui/button'
import { Store, Coins, Loader2, Database, Activity, Signal, Package, TrendingUp, MapPin } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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
  marketItems,
  loadingItems,
  onPurchase
}: MarketViewProps) {
  // Determine if we're at a child location (has parent location)
  const currentLoc = selectedLocation || character?.currentLocation

  // Filter market items by tab
  const localItems = marketItems.filter(item => item.isLocalSpecialty || false)
  const globalItems = marketItems.filter(item => !item.isLocalSpecialty)
  const p2pItems: MarketItem[] = [] // Placeholder - will be player-listed items

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'COMMON': return 'text-muted-foreground'
      case 'UNCOMMON': return 'text-green-500 dark:text-green-400'
      case 'RARE': return 'text-blue-500 dark:text-blue-400'
      case 'EPIC': return 'text-purple-500 dark:text-purple-400'
      case 'LEGENDARY': return 'text-yellow-500 dark:text-yellow-400'
      default: return 'text-muted-foreground'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HAT': return '🎩'
      case 'CLOTHING': return '👕'
      case 'ACCESSORY': return '💍'
      case 'TOOL': return '🔧'
      case 'CONSUMABLE': return '🧪'
      case 'MATERIAL': return '⚡'
      default: return '📦'
    }
  }

  const renderMarketItem = (marketItem: MarketItem) => {
    const isLoading = loadingItems.has(marketItem.id)
    const canAfford = character.coins >= marketItem.price
    const canBuy = marketItem.quantity > 0 && canAfford && !isLoading

    return (
      <div key={marketItem.id} className="bg-muted/30 border border-primary/20 rounded p-3 font-mono">
        <div className="grid grid-cols-[40px_1fr_auto] gap-3 items-center">
          {/* Icon */}
          <div className="w-10 h-10 bg-muted/50 border border-primary/20 rounded flex items-center justify-center text-primary">
            {getCategoryIcon(marketItem.item.category)}
          </div>

          {/* Item Details */}
          <div className="min-w-0">
            <div className="font-bold text-primary flex items-center gap-2 mb-1">
              <span className="truncate text-sm">{marketItem.item.name.toUpperCase()}</span>
              {marketItem.isLocalSpecialty && (
                <Badge variant="secondary" className="text-xs font-mono bg-amber-500/20 text-amber-600">
                  LOCAL
                </Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {marketItem.item.description}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`font-mono ${getRarityColor(marketItem.item.rarity)}`}>
                {marketItem.item.rarity}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground font-mono">
                VENDOR: {marketItem.is_system_item ? 'SYSTEM' : marketItem.seller?.name?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
          </div>

          {/* Price and Purchase Section */}
          <div className="flex flex-col items-end gap-1 min-w-[90px]">
            {/* Price */}
            <div className={`font-bold font-mono text-sm flex items-center gap-1 ${!canAfford && marketItem.quantity > 0 ? 'text-red-500' : 'text-primary'}`}>
              <Coins className="w-3 h-3" />
              <span>{marketItem.price}</span>
            </div>

            {/* Quantity */}
            <div className="text-xs text-muted-foreground font-mono">
              QTY: {marketItem.quantity > 0 ? marketItem.quantity : 'OUT'}
            </div>

            {/* Error Message */}
            {!canAfford && marketItem.quantity > 0 && (
              <div className="text-xs text-red-500 font-mono text-center leading-tight">
                NEED_{marketItem.price - character.coins}
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
              className="text-xs w-full h-6 font-mono"
              title={
                marketItem.quantity === 0 ? 'Out of stock' :
                  !canAfford ? `Need ${marketItem.price - character.coins} more coins` :
                    'Purchase this item'
              }
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : marketItem.quantity === 0 ? 'OUT' :
                !canAfford ? 'INSUFFICIENT' : 'ACQUIRE'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderEmptyState = (title: string, subtitle: string) => (
    <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center">
      <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <div className="text-muted-foreground font-mono">
        <div className="text-lg mb-2">{title}</div>
        <div className="text-sm">{subtitle}</div>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono text-primary">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">TRADE NETWORK ACCESS v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Signal className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">CONNECTED</span>
        </div>
      </div>

      {/* Market Status */}
      <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-4">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground mb-1">LOCATION</div>
            <div className="text-primary font-bold flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {currentLoc?.name.toUpperCase() || 'UNKNOWN'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">CREDIT_BALANCE</div>
            <div className="text-primary font-bold flex items-center gap-1">
              <Coins className="w-3 h-3" />
              {character.coins.toLocaleString()}_RUST
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">MARKET_STATUS</div>
            <div className="text-green-500 font-bold">OPERATIONAL</div>
          </div>
        </div>
      </div>

      {/* Trade Network Tabs */}
      <Tabs defaultValue="local" className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max h-10 p-1 bg-muted/50">
            <TabsTrigger value="local" className="text-xs font-mono flex-shrink-0 px-4">
              <Package className="w-3 h-3 mr-2" />
              LOCAL_MARKET
              {localItems.length > 0 && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-1 rounded">
                  {localItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="global" className="text-xs font-mono flex-shrink-0 px-4">
              <TrendingUp className="w-3 h-3 mr-2" />
              GLOBAL_NETWORK
              {globalItems.length > 0 && (
                <span className="ml-2 text-xs bg-primary/20 text-primary px-1 rounded">
                  {globalItems.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="p2p" className="text-xs font-mono flex-shrink-0 px-4">
              <Activity className="w-3 h-3 mr-2" />
              P2P_EXCHANGE
              <span className="ml-2 text-xs opacity-50 font-mono">[BETA]</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Local Market Tab */}
        <TabsContent value="local" className="mt-4">
          <div className="bg-muted/20 border border-primary/20 rounded p-2">
            <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              LOCAL_SPECIALTIES_CATALOG
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {localItems.length > 0 ? (
                  localItems.map(renderMarketItem)
                ) : (
                  renderEmptyState(
                    'NO_LOCAL_SPECIALTIES_AVAILABLE',
                    'LOCATION_SPECIFIC_ITEMS_NOT_IN_STOCK'
                  )
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Global Network Tab */}
        <TabsContent value="global" className="mt-4">
          <div className="bg-muted/20 border border-primary/20 rounded p-2">
            <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              GLOBAL_SUPPLY_NETWORK
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {globalItems.length > 0 ? (
                  globalItems.map(renderMarketItem)
                ) : (
                  renderEmptyState(
                    'GLOBAL_NETWORK_OFFLINE',
                    'MERCHANT_SUPPLY_CHAINS_RESTOCKING'
                  )
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* P2P Exchange Tab */}
        <TabsContent value="p2p" className="mt-4">
          <div className="bg-muted/20 border border-primary/20 rounded p-2">
            <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              PEER_TO_PEER_EXCHANGE_PROTOCOL
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
                  <div className="text-muted-foreground font-mono">
                    <div className="text-lg mb-2">P2P_PROTOCOL_INITIALIZING</div>
                    <div className="text-sm mb-4">SURVIVOR_LISTING_SYSTEM_COMING_ONLINE</div>
                    <div className="text-xs">
                      PLAYERS_WILL_LIST_INVENTORY_ITEMS<br />
                      DECENTRALIZED_TRADING_NETWORK<br />
                      LOCATION_BASED_EXCHANGES
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      {/* Market Statistics */}
      <div className="bg-muted/30 border border-primary/20 rounded p-3 mt-4">
        <div className="grid grid-cols-4 gap-4 text-xs text-center">
          <div>
            <div className="text-muted-foreground mb-1">TOTAL_LISTINGS</div>
            <div className="text-primary font-bold font-mono">{marketItems.length}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">LOCAL_ITEMS</div>
            <div className="text-primary font-bold font-mono">{localItems.length}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">GLOBAL_ITEMS</div>
            <div className="text-primary font-bold font-mono">{globalItems.length}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">AFFORDABLE</div>
            <div className="text-primary font-bold font-mono">
              {marketItems.filter(item => character.coins >= item.price && item.quantity > 0).length}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 mt-4 flex justify-between text-xs text-muted-foreground/60">
        <span>TRADE_NETWORK_v2089 | SECURE_TRANSACTIONS</span>
        <span>LAST_UPDATE: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
