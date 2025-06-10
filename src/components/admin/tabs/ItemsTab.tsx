// src/components/admin/tabs/ItemsTab.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { SearchBar } from '../SearchBar'
import { LoadingSpinner } from '../LoadingSpinner'
import { ErrorAlert } from '../ErrorAlert'
import type { AdminItem } from '@/types'  // Use your existing types

interface ItemsTabProps {
  items: AdminItem[]
  searchTerm: string
  onSearchChange: (term: string) => void
  loading: boolean
  error: string | null
  isProcessing: boolean
  onCreateItem: () => void
  onEditItem: (item: AdminItem) => void
  onDeleteItem: (itemId: string, itemName: string) => void
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
  onDeleteItem
}) => {
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRarityVariant = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY': return 'destructive'
      case 'EPIC': return 'default'
      case 'RARE': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-primary font-bold font-mono">
          ITEMS ({items.length})
        </span>
        <Button size="sm" onClick={onCreateItem} className="text-xs font-mono h-6">
          <Plus className="h-3 w-3 mr-1" />
          ADD
        </Button>
      </div>

      <SearchBar
        value={searchTerm}
        onChange={onSearchChange}
        placeholder="SEARCH_ITEMS..."
      />

      {error && (
        <ErrorAlert title="ERROR_LOADING_ITEMS" error={error} />
      )}

      <div className="bg-muted/30 border border-primary/20 rounded p-2">
        <ScrollArea className="h-64">
          {loading ? (
            <LoadingSpinner message="LOADING_ITEMS..." />
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
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
                      </div>

                      <div className="text-xs text-muted-foreground mb-1 line-clamp-2">
                        {item.description}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
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
                    </div>

                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditItem(item)}
                        disabled={isProcessing}
                        className="h-5 w-5 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteItem(item.id, item.name)}
                        disabled={isProcessing}
                        className="h-5 w-5 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

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
