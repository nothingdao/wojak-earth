// src/components/admin/tabs/EconomyTab.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Package, TrendingUp, Database, MapPin, Plus, Edit, Trash2 } from 'lucide-react'
import { StatCard } from '../StatCard'
import { SearchBar } from '../SearchBar'
import { LoadingSpinner } from '../LoadingSpinner'
import { ErrorAlert } from '../ErrorAlert'
import type { AdminMarketListing } from '@/types'  // Use your existing types

interface MarketStats {
  totalListings: number
  systemListings: number
  totalValue: number
  avgPrice: number
  locationBreakdown: Record<string, number>
}

interface EconomyTabProps {
  marketListings: AdminMarketListing[]
  marketStats: MarketStats
  searchTerm: string
  onSearchChange: (term: string) => void
  loading: boolean
  error: string | null
  isProcessing: boolean
  onCreateListing: () => void
  onEditListing: (listing: AdminMarketListing) => void
  onDeleteListing: (listingId: string, itemName: string) => void
}

export const EconomyTab: React.FC<EconomyTabProps> = ({
  marketListings,
  marketStats,
  searchTerm,
  onSearchChange,
  loading,
  error,
  isProcessing,
  onCreateListing,
  onEditListing,
  onDeleteListing
}) => {
  const filteredListings = marketListings.filter(listing =>
    !searchTerm ||
    listing.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    listing.sellerName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          title="ACTIVE_LISTINGS"
          value={marketStats.totalListings}
          subtitle={`${marketStats.systemListings} SYSTEM`}
          icon={Package}
          loading={loading}
        />
        <StatCard
          title="TOTAL_VALUE"
          value={marketStats.totalValue}
          subtitle="RUST"
          icon={TrendingUp}
          loading={loading}
        />
        <StatCard
          title="AVG_PRICE"
          value={marketStats.avgPrice}
          subtitle="PER_ITEM"
          icon={Database}
          loading={loading}
        />
        <StatCard
          title="LOCATIONS"
          value={Object.keys(marketStats.locationBreakdown).length}
          subtitle="WITH_MARKETS"
          icon={MapPin}
          loading={loading}
        />
      </div>

      {/* Search and Actions */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <SearchBar
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="SEARCH_LISTINGS..."
          />
        </div>
        <Button size="sm" onClick={onCreateListing} className="text-xs font-mono h-7">
          <Plus className="h-3 w-3 mr-1" />
          ADD
        </Button>
      </div>

      {error && (
        <ErrorAlert title="ERROR_LOADING_MARKET" error={error} />
      )}

      {/* Market Listings */}
      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <div className="flex items-center gap-2 mb-2 border-b border-primary/20 pb-2">
          <Package className="w-3 h-3" />
          <span className="text-primary font-bold text-xs font-mono">
            MARKET_LISTINGS ({marketListings.length})
          </span>
        </div>
        <ScrollArea className="h-48">
          {loading ? (
            <LoadingSpinner message="LOADING_MARKET_DATA..." />
          ) : (
            <div className="space-y-2">
              {filteredListings.map((listing) => (
                <div key={listing.id} className="bg-muted/20 border border-primary/10 rounded p-2 font-mono">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-primary font-bold text-xs">
                          {listing.itemName.toUpperCase()}
                        </div>
                        <Badge variant={listing.is_system_item ? 'secondary' : 'default'} className="text-xs">
                          {listing.is_system_item ? 'SYS' : 'PLR'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {listing.quantity > 0 ? 'AVAIL' : 'SOLD_OUT'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs mb-1">
                        <div>
                          <span className="text-muted-foreground">LOC:</span>
                          <span className="text-primary ml-1">{listing.locationName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SELLER:</span>
                          <span className="text-primary ml-1">{listing.sellerName || 'SYSTEM'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PRICE:</span>
                          <span className="text-yellow-500 font-bold ml-1">{listing.price}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">QTY:</span>
                          <span className="text-primary ml-1">{listing.quantity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditListing(listing)}
                        disabled={isProcessing}
                        className="h-5 w-5 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteListing(listing.id, listing.itemName)}
                        disabled={isProcessing}
                        className="h-5 w-5 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredListings.length === 0 && (
                <div className="text-center py-6 text-muted-foreground font-mono text-xs">
                  NO_MARKET_LISTINGS_FOUND
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
