// src/components/admin/tabs/ItemsTab.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, BarChart3, Filter } from 'lucide-react'
import { SearchBar } from '../SearchBar'
import { LoadingSpinner } from '../LoadingSpinner'
import { ErrorAlert } from '../ErrorAlert'
import type { Item, MarketListing, Location, Character, ItemCategory } from '@/types'

interface ItemsTabProps {
  items: Item[]
  searchTerm: string
  onSearchChange: (term: string) => void
  loading: boolean
  error: string | null
  isProcessing: boolean
  onCreateItem: () => void
  onEditItem: (item: Item) => void
  onDeleteItem: (itemId: string, itemName: string) => void
  onViewItemMarkets: (item: Item) => void
  marketListings?: MarketListing[]
  locations?: Location[]
}

export const ItemsTab: React.FC<ItemsTabProps> = ({
  items,
  searchTerm,
  onSearchChange,
  loading,
  error,
  isProcessing,
  onCreateItem,
  onEditItem,
  onDeleteItem,
  onViewItemMarkets,
  marketListings = [],
  locations = []
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredItems = items.filter(item => {
    // Category filter
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false
    }

    // Search filter
    if (!searchTerm) return true
    return item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.category.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const getRarityVariant = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return 'destructive'
      case 'EPIC': return 'default'
      case 'RARE': return 'secondary'
      default: return 'outline'
    }
  }

  const getItemMarketInfo = (itemId: string) => {
    const itemListings = marketListings.filter(listing => listing.item_id === itemId)
    const listingCount = itemListings.length
    const totalQuantity = itemListings.reduce((sum, listing) => sum + listing.quantity, 0)
    const minPrice = itemListings.length > 0 ? Math.min(...itemListings.map(l => l.price)) : 0
    const maxPrice = itemListings.length > 0 ? Math.max(...itemListings.map(l => l.price)) : 0
    
    return { listingCount, totalQuantity, minPrice, maxPrice }
  }

  const categoryCount = {
    CLOTHING: items.filter(i => i.category === 'CLOTHING').length,
    HAT: items.filter(i => i.category === 'HAT').length,
    ACCESSORY: items.filter(i => i.category === 'ACCESSORY').length,
    TOOL: items.filter(i => i.category === 'TOOL').length,
    CONSUMABLE: items.filter(i => i.category === 'CONSUMABLE').length,
    MATERIAL: items.filter(i => i.category === 'MATERIAL').length
  }
  
  const categories: ItemCategory[] = ['CLOTHING', 'HAT', 'ACCESSORY', 'TOOL', 'CONSUMABLE', 'MATERIAL']

  return (
    <div className="space-y-3">
      {/* Compact Stats */}
      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex gap-4 flex-wrap">
            <span><span className="text-muted-foreground">TOTAL:</span> <span className="text-primary">{items.length}</span></span>
            <span><span className="text-muted-foreground">CLOTHING:</span> <span className="text-blue-400">{categoryCount.CLOTHING}</span></span>
            <span><span className="text-muted-foreground">TOOLS:</span> <span className="text-green-400">{categoryCount.TOOL}</span></span>
            <span><span className="text-muted-foreground">MATERIALS:</span> <span className="text-yellow-400">{categoryCount.MATERIAL}</span></span>
            <span><span className="text-muted-foreground">CONSUMABLES:</span> <span className="text-red-400">{categoryCount.CONSUMABLE}</span></span>
            <span><span className="text-muted-foreground">SHOWING:</span> <span className="text-primary">{filteredItems.length}</span></span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-primary font-bold font-mono">
          ITEMS ({items.length})
        </span>
        <Button size="sm" onClick={onCreateItem} className="text-xs font-mono h-6">
          <Plus className="h-3 w-3 mr-1" />
          ADD
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SearchBar
              value={searchTerm}
              onChange={onSearchChange}
              placeholder="SEARCH_ITEMS..."
            />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32 h-7 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs font-mono">ALL_CATEGORIES</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category} className="text-xs font-mono">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && (
        <ErrorAlert title="ERROR_LOADING_ITEMS" error={error} />
      )}

      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <ScrollArea className="h-64">
          {loading ? (
            <LoadingSpinner message="LOADING_ITEMS..." />
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const marketInfo = getItemMarketInfo(item.id)
                
                return (
                  <div key={item.id} className="bg-muted/20 border border-primary/10 rounded p-2 font-mono">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-primary font-bold text-xs">
                            {item.name.toUpperCase()}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                          <Badge variant={getRarityVariant(item.rarity)} className="text-xs">
                            {item.rarity}
                          </Badge>
                          {marketInfo.listingCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {marketInfo.listingCount} MARKETS
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground mb-1 line-clamp-2">
                          {item.description}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs mb-1">
                          {item.energy_effect && (
                            <div>
                              <span className="text-muted-foreground">ENERGY:</span>
                              <span className="text-blue-500 font-bold ml-1">+{item.energy_effect}</span>
                            </div>
                          )}
                          {item.health_effect && (
                            <div>
                              <span className="text-muted-foreground">HEALTH:</span>
                              <span className="text-red-500 font-bold ml-1">+{item.health_effect}</span>
                            </div>
                          )}
                          {item.durability && (
                            <div>
                              <span className="text-muted-foreground">DURABILITY:</span>
                              <span className="text-primary ml-1">{item.durability}</span>
                            </div>
                          )}
                        </div>

                        {/* Market Info */}
                        {marketInfo.listingCount > 0 && (
                          <div className="grid grid-cols-3 gap-2 text-xs border-t border-primary/10 pt-1">
                            <div>
                              <span className="text-muted-foreground">QTY:</span>
                              <span className="text-primary ml-1">{marketInfo.totalQuantity}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">MIN:</span>
                              <span className="text-green-500 ml-1">{marketInfo.minPrice}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">MAX:</span>
                              <span className="text-red-500 ml-1">{marketInfo.maxPrice}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewItemMarkets(item)}
                          disabled={isProcessing}
                          className="h-5 w-5 p-0"
                          title="View Markets"
                        >
                          <BarChart3 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditItem(item)}
                          disabled={isProcessing}
                          className="h-5 w-5 p-0"
                          title="Edit Item"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteItem(item.id, item.name)}
                          disabled={isProcessing}
                          className="h-5 w-5 p-0"
                          title="Delete Item"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredItems.length === 0 && (
                <div className="text-center py-6 text-muted-foreground font-mono text-xs">
                  {searchTerm
                    ? `NO_ITEMS_FOUND_MATCHING "${searchTerm.toUpperCase()}"`
                    : 'NO_ITEMS_FOUND'
                  }
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
