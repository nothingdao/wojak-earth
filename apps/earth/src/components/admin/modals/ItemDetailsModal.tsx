// src/components/admin/modals/ItemDetailsModal.tsx
import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Edit, Trash2, MapPin } from 'lucide-react'
import type { Item, MarketListing, Location, Character } from '@/types'

interface ItemDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Item | null
  marketListings: MarketListing[]
  locations: Location[]
  characters: Character[]
  onEditListing: (listing: MarketListing) => void
  onDeleteListing: (listingId: string, itemName: string) => void
  onCreateListing: (item: Item, location: Location) => void
  isProcessing: boolean
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  open,
  onOpenChange,
  item,
  marketListings,
  locations,
  characters,
  onEditListing,
  onDeleteListing,
  onCreateListing,
  isProcessing
}) => {
  if (!item) return null

  // Filter listings for this item
  const itemListings = marketListings.filter(listing => listing.item_id === item.id)
  
  // Get locations with markets
  const marketLocations = locations.filter(loc => loc.has_market)
  
  // Create a map of location_id -> listing for this item
  const listingsByLocation = itemListings.reduce((acc, listing) => {
    acc[listing.location_id] = listing
    return acc
  }, {} as Record<string, MarketListing>)

  const getSellerName = (sellerId: string | null) => {
    if (!sellerId) return 'SYSTEM'
    const seller = characters.find(c => c.id === sellerId)
    return seller?.name || `User-${sellerId.slice(0, 8)}`
  }

  const getRarityVariant = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return 'destructive'
      case 'EPIC': return 'default'
      case 'RARE': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl font-mono max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">ITEM_MARKET_OVERVIEW</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            MANAGE_MARKET_LISTINGS_FOR_{item.name.toUpperCase()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Item Info */}
          <div className="bg-muted/30 border border-primary/20 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-primary font-bold text-sm">
                {item.name.toUpperCase()}
              </div>
              <Badge variant="outline" className="text-xs">
                {item.category}
              </Badge>
              <Badge variant={getRarityVariant(item.rarity)} className="text-xs">
                {item.rarity}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {item.description}
            </div>
            <div className="flex gap-4 text-xs">
              <span><span className="text-muted-foreground">LISTED_AT:</span> <span className="text-primary">{itemListings.length}</span> locations</span>
              <span><span className="text-muted-foreground">AVAILABLE_AT:</span> <span className="text-primary">{marketLocations.length}</span> markets</span>
            </div>
          </div>

          {/* Market Listings by Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="text-primary font-bold text-xs font-mono">
                MARKET_PRESENCE ({marketLocations.length} locations)
              </span>
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {marketLocations.map((location) => {
                  const listing = listingsByLocation[location.id]
                  const sellerName = listing ? getSellerName(listing.seller_id) : null

                  return (
                    <div key={location.id} className="bg-muted/20 border border-primary/10 rounded p-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-primary font-bold text-xs">
                              {location.name.toUpperCase()}
                            </div>
                            {listing ? (
                              <Badge variant="default" className="text-xs">
                                LISTED
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                NOT_LISTED
                              </Badge>
                            )}
                          </div>
                          
                          {listing ? (
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">PRICE:</span>
                                <span className="text-yellow-500 font-bold ml-1">{listing.price}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">QTY:</span>
                                <span className="text-primary ml-1">{listing.quantity}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">SELLER:</span>
                                <span className="text-primary ml-1">{sellerName}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No active listing at this location
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1 ml-2">
                          {listing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onEditListing(listing)}
                                disabled={isProcessing}
                                className="h-6 w-6 p-0"
                                title="Edit Listing"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDeleteListing(listing.id, item.name)}
                                disabled={isProcessing}
                                className="h-6 w-6 p-0"
                                title="Delete Listing"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onCreateListing(item, location)}
                              disabled={isProcessing}
                              className="h-6 w-6 p-0"
                              title="Add Listing"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Quick Stats */}
          {itemListings.length > 0 && (
            <div className="bg-muted/30 border border-primary/20 rounded p-2">
              <div className="text-xs font-mono">
                <div className="flex gap-4 flex-wrap">
                  <span><span className="text-muted-foreground">MIN_PRICE:</span> <span className="text-green-500">{Math.min(...itemListings.map(l => l.price))}</span></span>
                  <span><span className="text-muted-foreground">MAX_PRICE:</span> <span className="text-red-500">{Math.max(...itemListings.map(l => l.price))}</span></span>
                  <span><span className="text-muted-foreground">TOTAL_QTY:</span> <span className="text-primary">{itemListings.reduce((sum, l) => sum + l.quantity, 0)}</span></span>
                  <span><span className="text-muted-foreground">TOTAL_VALUE:</span> <span className="text-yellow-500">{itemListings.reduce((sum, l) => sum + (l.price * l.quantity), 0)}</span></span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 font-mono text-xs"
              onClick={() => onOpenChange(false)}
            >
              CLOSE
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}