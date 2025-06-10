import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Grid3X3,
  Grid2X2,
  Search,
  User,
  MapPin,
  Calendar,
  Skull,
  Database,
  Activity,
  Filter,
  Hash,
  Zap,
  Heart,
  Coins,
  AlertTriangle,
  Eye,
  Copy,
  ExternalLink,
  Signal
} from 'lucide-react'

interface Character {
  id: string
  name: string
  gender: 'MALE' | 'FEMALE'
  level: number
  energy: number
  health: number
  coins: number
  solBalance: number
  character_type: 'HUMAN' | 'NPC'
  status: 'ACTIVE' | 'DEAD' | 'INACTIVE'
  current_image_url?: string
  currentLocation: {
    id: string
    name: string
    biome: string
  }
  created_at: string
  wallet_address: string
  nft_address?: string
}

const API_BASE = '/.netlify/functions'

// Hook to fetch all characters from your API
const useCharacters = () => {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCharacters = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE}/get-all-characters`)

      if (!response.ok) {
        throw new Error('Failed to fetch characters')
      }

      const data = await response.json()

      // Fetch SOL balances for each character
      const charactersWithBalance = await Promise.all(
        (data.characters || []).map(async (character: Character) => {
          try {
            // You'll need to create this endpoint or use existing one
            const balanceResponse = await fetch(`${API_BASE}/get-sol-balance?wallet_address=${character.wallet_address}`)
            if (balanceResponse.ok) {
              const balanceData = await balanceResponse.json()
              return { ...character, solBalance: balanceData.solBalance }
            }
            return { ...character, solBalance: 0 }
          } catch (err) {
            console.warn(`Failed to fetch SOL balance for ${character.name}:`, err)
            return { ...character, solBalance: 0 }
          }
        })
      )

      setCharacters(charactersWithBalance)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch characters')
      console.error('Error fetching characters:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCharacters()
  }, [])

  return { characters, loading, error, refetch: fetchCharacters }
}

const getRarityColor = (level: number) => {
  if (level >= 20) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
  if (level >= 15) return 'bg-purple-500/20 text-purple-500 border-purple-500/30'
  if (level >= 10) return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
  if (level >= 5) return 'bg-green-500/20 text-green-500 border-green-500/30'
  return 'bg-gray-500/20 text-gray-500 border-gray-500/30'
}

const getRarityLabel = (level: number) => {
  if (level >= 20) return 'LEGENDARY'
  if (level >= 15) return 'EPIC'
  if (level >= 10) return 'RARE'
  if (level >= 5) return 'UNCOMMON'
  return 'COMMON'
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'text-green-500 border-green-500/50 bg-green-500/20'
    case 'DEAD': return 'text-red-500 border-red-500/50 bg-red-500/20'
    case 'INACTIVE': return 'text-gray-500 border-gray-500/50 bg-gray-500/20'
    default: return 'text-gray-500 border-gray-500/50 bg-gray-500/20'
  }
}

const copyToClipboard = (text: string, label: string) => {
  navigator.clipboard.writeText(text)
  // You might want to add a toast notification here
  console.log(`${label} copied to clipboard`)
}

export default function CharactersView() {
  const { characters, loading, error, refetch } = useCharacters()
  const [gridSize, setGridSize] = useState<'2' | '3'>('3')
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [biomeFilter, setBiomeFilter] = useState<string>('all')
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([])
  const [selectedCharacterBalance, setSelectedCharacterBalance] = useState(null)

  const fetchCharacterBalance = async (wallet_address) => {
    try {
      setSelectedCharacterBalance(null) // Show loading
      const response = await fetch(`${API_BASE}/get-sol-balance?wallet_address=${wallet_address}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedCharacterBalance(data.solBalance)
      } else {
        setSelectedCharacterBalance(0)
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err)
      setSelectedCharacterBalance(0)
    }
  }

  // Apply filters whenever filters or characters change
  useEffect(() => {
    let filtered = characters

    if (searchQuery) {
      filtered = filtered.filter(char =>
        char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        char.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (genderFilter !== 'all') {
      filtered = filtered.filter(char => char.gender === genderFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(char => char.character_type === typeFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(char => char.status === statusFilter)
    }

    if (levelFilter !== 'all') {
      if (levelFilter === '1') {
        filtered = filtered.filter(char => char.level === 1)
      } else if (levelFilter === '2-4') {
        filtered = filtered.filter(char => char.level >= 2 && char.level <= 4)
      } else if (levelFilter === '5-9') {
        filtered = filtered.filter(char => char.level >= 5 && char.level <= 9)
      } else if (levelFilter === '10+') {
        filtered = filtered.filter(char => char.level >= 10)
      }
    }

    if (biomeFilter !== 'all') {
      filtered = filtered.filter(char => char.currentLocation.biome === biomeFilter)
    }

    setFilteredCharacters(filtered)
  }, [characters, searchQuery, genderFilter, typeFilter, statusFilter, levelFilter, biomeFilter])

  // Get unique biomes for filter dropdown
  const uniqueBiomes = [...new Set(characters.map(char => char.currentLocation.biome))].filter(Boolean)

  // Get level distribution for display
  const levelCounts = {
    level1: characters.filter(c => c.level === 1).length,
    level2to4: characters.filter(c => c.level >= 2 && c.level <= 4).length,
    level5to9: characters.filter(c => c.level >= 5 && c.level <= 9).length,
    level10plus: characters.filter(c => c.level >= 10).length,
  }

  // Get status counts for display
  const statusCounts = {
    active: characters.filter(c => c.status === 'ACTIVE').length,
    dead: characters.filter(c => c.status === 'DEAD').length,
    inactive: characters.filter(c => c.status === 'INACTIVE').length,
  }

  const gridCols = gridSize === '2' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'

  const hasActiveFilters = searchQuery || genderFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || levelFilter !== 'all' || biomeFilter !== 'all'

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono text-primary">
        {/* Error Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="text-primary font-bold">NFT GALLERY INTERFACE v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="text-red-500 text-xs">CONNECTION_FAILED</span>
          </div>
        </div>

        <div className="bg-muted/30 border border-red-500/30 rounded p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-red-500 font-mono mb-4">
            <div className="text-lg mb-2">GALLERY_ACCESS_DENIED</div>
            <div className="text-sm">{error}</div>
          </div>
          <Button onClick={refetch} variant="outline" className="font-mono">
            RETRY_CONNECTION
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono text-primary">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">NFT GALLERY INTERFACE v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={gridSize}
            onValueChange={(value) => value && setGridSize(value as '2' | '3')}
            className="border border-primary/20 p-1"
          >
            <ToggleGroupItem value="2" aria-label="Large view" className="h-6 w-6 p-0">
              <Grid2X2 className="h-3 w-3" />
            </ToggleGroupItem>
            <ToggleGroupItem value="3" aria-label="Compact view" className="h-6 w-6 p-0">
              <Grid3X3 className="h-3 w-3" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">
            {loading ? 'SCANNING' : 'ONLINE'}
          </span>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-muted/30 border border-primary/20 rounded p-3 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground mb-1">TOTAL_SPECIMENS</div>
            <div className="text-primary font-bold font-mono">
              {loading ? 'SCANNING...' : `${filteredCharacters.length}/${characters.length}`}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">ACTIVE_STATUS</div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-green-500 font-mono">{statusCounts.active}_LIVE</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-red-500 font-mono">{statusCounts.dead}_KIA</span>
              </div>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">LEVEL_DIST</div>
            <div className="flex items-center gap-1 text-xs font-mono">
              <span className="text-gray-500">L1:{levelCounts.level1}</span>
              <span className="text-green-500">L2-4:{levelCounts.level2to4}</span>
              <span className="text-blue-500">L5-9:{levelCounts.level5to9}</span>
              {levelCounts.level10plus > 0 && <span className="text-purple-500">L10+:{levelCounts.level10plus}</span>}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">GRID_MODE</div>
            <div className="text-primary font-bold font-mono">
              {gridSize === '2' ? 'EXPANDED' : 'COMPACT'}_VIEW
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
        <div className="flex items-center gap-2 mb-3 border-b border-primary/20 pb-2">
          <Filter className="w-4 h-4" />
          <span className="text-primary font-bold text-sm">SPECIMEN_FILTERS</span>
          {hasActiveFilters && (
            <Badge variant="outline" className="text-xs font-mono">
              {[searchQuery, genderFilter !== 'all' ? genderFilter : '', typeFilter !== 'all' ? typeFilter : '', statusFilter !== 'all' ? statusFilter : '', levelFilter !== 'all' ? levelFilter : '', biomeFilter !== 'all' ? biomeFilter : ''].filter(Boolean).length}_ACTIVE
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="SEARCH_SPECIMEN_ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs font-mono bg-muted/50 border-primary/20"
            />
          </div>

          {/* Gender Filter */}
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="h-8 text-xs font-mono bg-muted/50 border-primary/20">
              <SelectValue placeholder="GENDER" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">ALL_GENDER</SelectItem>
              <SelectItem value="MALE" className="text-xs font-mono">MALE</SelectItem>
              <SelectItem value="FEMALE" className="text-xs font-mono">FEMALE</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs font-mono bg-muted/50 border-primary/20">
              <SelectValue placeholder="TYPE" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">ALL_TYPES</SelectItem>
              <SelectItem value="HUMAN" className="text-xs font-mono">HUMAN</SelectItem>
              <SelectItem value="NPC" className="text-xs font-mono">NPC</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs font-mono bg-muted/50 border-primary/20">
              <SelectValue placeholder="STATUS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">ALL_STATUS</SelectItem>
              <SelectItem value="ACTIVE" className="text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  ACTIVE
                </div>
              </SelectItem>
              <SelectItem value="DEAD" className="text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Skull className="w-3 h-3 text-red-500" />
                  KIA
                </div>
              </SelectItem>
              <SelectItem value="INACTIVE" className="text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  INACTIVE
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Level Filter */}
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="h-8 text-xs font-mono bg-muted/50 border-primary/20">
              <SelectValue placeholder="LEVEL" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">ALL_LEVELS</SelectItem>
              <SelectItem value="1" className="text-xs font-mono">LVL_1</SelectItem>
              <SelectItem value="2-4" className="text-xs font-mono">LVL_2-4</SelectItem>
              <SelectItem value="5-9" className="text-xs font-mono">LVL_5-9</SelectItem>
              <SelectItem value="10+" className="text-xs font-mono">LVL_10+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Biome Filter & Clear */}
        <div className="flex items-center gap-3 mt-3">
          <Select value={biomeFilter} onValueChange={setBiomeFilter}>
            <SelectTrigger className="w-[150px] h-8 text-xs font-mono bg-muted/50 border-primary/20">
              <SelectValue placeholder="BIOME" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-mono">ALL_BIOMES</SelectItem>
              {uniqueBiomes.map(biome => (
                <SelectItem key={biome} value={biome} className="text-xs font-mono">
                  {biome.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setGenderFilter('all')
                setTypeFilter('all')
                setStatusFilter('all')
                setLevelFilter('all')
                setBiomeFilter('all')
              }}
              className="h-8 px-3 text-xs font-mono"
            >
              CLEAR_FILTERS
            </Button>
          )}
        </div>
      </div>

      {/* Character Grid */}
      {loading ? (
        <div className={`grid gap-3 ${gridCols} mb-4`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-muted/30 border border-primary/20 rounded animate-pulse">
              <div className="w-full aspect-[3/4] bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <ScrollArea className="h-[600px] mb-4">
          <div className={`grid gap-3 ${gridCols} pr-4`}>
            {filteredCharacters.map((character) => (
              <div
                key={character.id}
                className={`cursor-pointer hover:border-primary/50 transition-all duration-200 overflow-hidden group rounded border border-primary/20 bg-muted/30 relative ${character.status === 'DEAD' ? 'opacity-75 grayscale' : ''
                  }`}
                onClick={() => {
                  setSelectedCharacter(character)
                  fetchCharacterBalance(character.wallet_address)
                }}
              >
                {/* Character Image Container */}
                <div className="w-full relative">
                  {character.current_image_url ? (
                    <img
                      src={character.current_image_url}
                      alt={character.name}
                      className="w-full h-auto object-contain rounded"
                      onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}

                  {/* Fallback Avatar */}
                  <div className={`w-full aspect-square flex items-center justify-center bg-muted/50 rounded ${character.current_image_url ? 'hidden' : ''}`}>
                    <User className="h-1/3 w-1/3 text-muted-foreground" />
                  </div>

                  {/* Death Overlay */}
                  {character.status === 'DEAD' && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded">
                      <div className="text-red-500 text-center font-mono">
                        <Skull className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-xs font-bold">KIA</div>
                      </div>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end rounded">
                    <div className="p-2 w-full">
                      <div className="text-white font-bold text-xs truncate font-mono mb-1">
                        {character.name.toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs font-mono h-4 px-1 ${getRarityColor(character.level)} border-white/30`}
                        >
                          L{character.level}
                        </Badge>
                        {character.character_type === 'NPC' && (
                          <Badge variant="outline" className="text-xs font-mono h-4 px-1 text-white border-white/50">
                            NPC
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-xs font-mono h-4 px-1 ${getStatusColor(character.status)} border-white/30`}>
                          {character.status === 'DEAD' ? 'KIA' : character.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Empty State */}
      {!loading && filteredCharacters.length === 0 && (
        <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center mb-4">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-muted-foreground font-mono">
            <div className="text-lg mb-2">
              {characters.length === 0 ? 'NO_SPECIMENS_DETECTED' : 'FILTER_CRITERIA_NO_MATCH'}
            </div>
            <div className="text-sm">
              {characters.length === 0
                ? 'AWAITING_FIRST_GENERATION'
                : 'ADJUST_SEARCH_PARAMETERS'
              }
            </div>
          </div>
          {characters.length === 0 && (
            <Button onClick={refetch} className="mt-4 font-mono">
              RESCAN_DATABASE
            </Button>
          )}
        </div>
      )}

      {/* Character Detail Modal */}
      <Dialog open={!!selectedCharacter} onOpenChange={(open) => {
        if (!open) {
          setSelectedCharacter(null)
          setSelectedCharacterBalance(null)
        }
      }}>
        <DialogContent className="max-w-md bg-background border border-primary/30 font-mono">
          <DialogHeader className="border-b border-primary/20 pb-2">
            <DialogTitle className="flex items-center gap-2 text-primary font-mono">
              <Eye className="w-4 h-4" />
              SPECIMEN_ANALYSIS
            </DialogTitle>
          </DialogHeader>

          {selectedCharacter && (
            <div className="space-y-4">
              {/* Character Header */}
              <div className="bg-muted/30 border border-primary/20 rounded p-3">
                <div className="flex items-center gap-3">
                  <Avatar className={`w-12 h-12 border border-primary/20 ${selectedCharacter.status === 'DEAD' ? 'grayscale opacity-75' : ''}`}>
                    <AvatarImage src={selectedCharacter.current_image_url} />
                    <AvatarFallback className="bg-muted/50 font-mono">
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-primary font-bold text-sm font-mono">{selectedCharacter.name.toUpperCase()}</div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className={`text-xs font-mono ${getRarityColor(selectedCharacter.level)}`}>
                        {getRarityLabel(selectedCharacter.level)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {selectedCharacter.character_type}
                      </Badge>
                      <Badge variant="outline" className={`text-xs font-mono ${getStatusColor(selectedCharacter.status)}`}>
                        {selectedCharacter.status === 'DEAD' && <Skull className="w-3 h-3 mr-1" />}
                        {selectedCharacter.status === 'DEAD' ? 'KIA' : selectedCharacter.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Death Notice */}
              {selectedCharacter.status === 'DEAD' && (
                <div className="bg-red-500/20 border border-red-500/30 rounded p-3">
                  <div className="flex items-center gap-2 text-red-500 font-mono text-sm">
                    <Skull className="h-4 w-4" />
                    <span className="font-bold">SPECIMEN_TERMINATED</span>
                  </div>
                  <div className="text-xs text-red-400 mt-1 font-mono">
                    COMBAT_CASUALTY_CONFIRMED
                  </div>
                </div>
              )}

              {/* Vital Statistics */}
              <div className="bg-muted/30 border border-primary/20 rounded p-3">
                <div className="text-muted-foreground text-xs mb-2 font-mono">VITAL_STATISTICS</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-1">CLEARANCE_LVL</div>
                    <div className="text-xl font-bold text-primary font-mono">{selectedCharacter.level}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">RUST</div>
                    <div className="text-xl font-bold text-primary font-mono">{selectedCharacter.coins.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">SOL_BALANCE</div>
                    <div className="text-lg font-bold text-primary font-mono">
                      {selectedCharacterBalance !== null
                        ? `${selectedCharacterBalance.toFixed(4)}`
                        : 'SCANNING...'}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">USD_VALUE</div>
                    <div className="text-lg font-bold text-green-500 font-mono">
                      {selectedCharacterBalance !== null
                        ? `${(selectedCharacterBalance * 180).toFixed(2)}`
                        : '--'}
                    </div>
                  </div>
                </div>

                {/* Health/Energy Bars */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">ENERGY_LVL</div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      <div className="text-sm font-bold text-primary font-mono">{selectedCharacter.energy}%</div>
                      <div className="flex-1 bg-muted/50 rounded-full h-1">
                        <div
                          className="bg-yellow-500 h-1 rounded-full transition-all"
                          style={{ width: `${selectedCharacter.energy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">HEALTH_LVL</div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-3 h-3 text-red-500" />
                      <div className="text-sm font-bold text-primary font-mono">{selectedCharacter.health}%</div>
                      <div className="flex-1 bg-muted/50 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all ${selectedCharacter.status === 'DEAD' ? 'bg-gray-400' : 'bg-red-500'
                            }`}
                          style={{ width: `${selectedCharacter.health}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Data */}
              <div className="bg-muted/30 border border-primary/20 rounded p-3">
                <div className="text-muted-foreground text-xs mb-2 font-mono">LOCATION_DATA</div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="text-primary font-bold text-sm font-mono">{selectedCharacter.currentLocation.name.toUpperCase()}</span>
                  <Badge variant="outline" className="text-xs font-mono">{selectedCharacter.currentLocation.biome.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Calendar className="h-3 w-3" />
                  <span>GENESIS: {new Date(selectedCharacter.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Blockchain Data */}
              <div className="bg-muted/30 border border-primary/20 rounded p-3">
                <div className="text-muted-foreground text-xs mb-2 font-mono">BLOCKCHAIN_DATA</div>

                <div className="space-y-2">
                  <div>
                    <div className="text-muted-foreground text-xs mb-1">WALLET_ADDRESS</div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-xs bg-muted/50 border border-primary/10 px-2 py-1 rounded flex-1 break-all text-primary">
                        {selectedCharacter.wallet_address}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedCharacter.wallet_address, 'Wallet address')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {selectedCharacter.nft_address && (
                    <div>
                      <div className="text-muted-foreground text-xs mb-1">NFT_ADDRESS</div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-xs bg-muted/50 border border-primary/10 px-2 py-1 rounded flex-1 break-all text-primary">
                          {selectedCharacter.nft_address}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedCharacter.nft_address!, 'NFT address')}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://explorer.solana.com/address/${selectedCharacter.nft_address}`, '_blank')}
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-muted-foreground text-xs mb-1">SPECIMEN_ID</div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      <div className="font-mono text-xs bg-muted/50 border border-primary/10 px-2 py-1 rounded flex-1 break-all text-primary">
                        {selectedCharacter.id}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedCharacter.id, 'Character ID')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 flex justify-between text-xs text-muted-foreground/60">
        <span>NFT_GALLERY_v2089 | SPECIMEN_DATABASE</span>
        <span>LAST_SCAN: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
