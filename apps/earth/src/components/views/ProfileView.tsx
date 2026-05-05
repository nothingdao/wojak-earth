// src/components/views/ProfileView.tsx
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Wallet,
  Copy,
  ExternalLink,
  RefreshCw,
  Zap,
  Heart,
  Package,
  Coins,
  Shield,
  Star,
  Globe,
  Hash,
  Calendar,
  Layers,
  Database,
  Activity,
  Signal,
  MapPin,
  MessageSquare,
  Brain,
  Award,
  Target,
  TrendingUp,
  Lock,
  Unlock,
  ChevronRight,
  BarChart3,
  BookOpen,
  Flag,
  CheckCircle
} from 'lucide-react'
import { useWalletInfo } from '@/hooks/useWalletInfo'
import { toast } from '@/components/ui/use-toast'
import type { Character } from '@/types'
import { BurnCharacter } from '../BurnCharacter'
import { useNetwork } from '@/contexts/NetworkContext'
import { getStoryFlagStatistics, getStoryFlags, type StoryFlag } from '@/utils/story-flags'

interface ProfileViewProps {
  character: Character
  onCharacterUpdated?: () => void
}

export const ProfileView: React.FC<ProfileViewProps> = ({ character, onCharacterUpdated }) => {
  // console.log('🖼️ ProfileView render - earth:', character.earth, 'character ID:', character.id, 'object ref:', character)

  const walletInfo = useWalletInfo()
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [storyFlagStats, setStoryFlagStats] = useState<{
    totalFlags: number
    flagsByStory: Record<string, number>
    flagsByChapter: Record<string, number>
    recentFlags: StoryFlag[]
  } | null>(null)
  const [allStoryFlags, setAllStoryFlags] = useState<StoryFlag[]>([])
  const { getExplorerUrl, isDevnet } = useNetwork()

  // Load story flag stats and all flags when character changes
  useEffect(() => {
    if (character?.id) {
      // Load stats from new story_flags table
      getStoryFlagStatistics(character.id).then(({ data, error }) => {
        if (!error && data) {
          setStoryFlagStats(data)
        }
      })
      
      // Load all flags from new story_flags table
      getStoryFlags(character.id).then(({ data, error }) => {
        if (!error && data) {
          setAllStoryFlags(data)
        }
      })
    }
  }, [character?.id])

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const openInExplorer = (address: string) => {
    window.open(getExplorerUrl(address), '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-success dark:text-green-400'
      case 'DEAD': return 'text-error dark:text-red-400'
      case 'PENDING_MINT': return 'text-yellow-500 dark:text-yellow-400'
      default: return 'text-muted-foreground'
    }
  }

  const renderCharacterProfile = () => (
    <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-primary font-bold">PLAYER DOSSIER v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Signal className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">CLASSIFIED</span>
        </div>
      </div>

      {/* Character Header Section */}
      <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          {/* Character Image */}
          <div className="mx-auto md:mx-0">
            <div className="w-48 h-48 bg-muted/50 border border-primary/20 rounded flex items-center justify-center overflow-hidden relative">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <Activity className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}

              {!imageError ? (
                <img
                  src={character.current_image_url || "eve.png"}
                  alt={character.name}
                  className="w-full h-full object-contain relative z-10"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  style={{ display: imageLoading ? 'none' : 'block' }}
                />
              ) : (
                <div className="text-4xl text-muted-foreground">🥺</div>
              )}
            </div>
          </div>

          {/* Character Info */}
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-muted-foreground mb-1">DESIGNATION</div>
                <div className="text-primary font-bold text-lg">{character.name.toUpperCase()}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">CLEARANCE_LVL</div>
                <div className="text-primary font-bold text-lg flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  {character.level}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">PHENOTYPE</div>
                <div className="text-primary font-bold">{character.gender}_{character.character_type}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">STATUS</div>
                <div className={`font-bold ${getStatusColor(character.status || 'ACTIVE')}`}>
                  {(character.status || 'ACTIVE').toUpperCase()}
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                <Hash className="w-3 h-3 mr-1" />
                VER_{character.current_version}
              </Badge>
              {isDevnet && (
                <Badge variant="secondary" className="text-xs font-mono bg-orange-500/20 text-orange-600">
                  <Globe className="w-3 h-3 mr-1" />
                  DEVNET_NODE
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-mono">
                <Shield className="w-3 h-3 mr-1" />
                AUTHORIZED
              </Badge>
            </div>

            {/* Subject ID */}
            <div className="bg-muted/20 border border-primary/10 rounded p-2">
              <div className="text-muted-foreground text-xs mb-1">SUBJECT_ID</div>
              <div className="text-xs font-mono text-primary break-all">{character.id}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Vital Statistics */}
      <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
        <div className="text-muted-foreground text-xs mb-3">VITAL_STATISTICS</div>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">ENERGY</span>
            </div>
            <div className="text-primary font-bold text-lg font-mono">
              {character.energy}/100
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 mt-1">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${character.energy}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">HEALTH</span>
            </div>
            <div className="text-primary font-bold text-lg font-mono">
              {character.health}/100
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 mt-1">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${character.health}%` }}
              />
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">EARTH</span>
            </div>
            <div className="text-primary font-bold text-lg font-mono">
              {character.earth.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">EARTH_COIN</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Package className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">INVENTORY</span>
            </div>
            <div className="text-primary font-bold text-lg font-mono">
              {character.inventory.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">ITEMS</div>
          </div>
        </div>
      </div>

      {/* Current Location */}
      <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
        <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          CURRENT_COORDINATES
        </div>
        <div className="text-primary font-bold text-lg font-mono mb-2">
          {character.currentLocation.name.toUpperCase()}
        </div>
        <div className="text-xs text-muted-foreground">
          {character.currentLocation.description}
        </div>
      </div>

      {/* NFT Metadata Section */}
      {character.nft_address && (
        <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
          <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            BLOCKCHAIN_METADATA
          </div>

          <div className="space-y-3">
            {/* NFT Address */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">NFT_ADDRESS</div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono bg-muted/50 border border-primary/10 px-2 py-1 rounded flex-1 break-all text-primary">
                  {character.nft_address}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(character.nft_address!, 'NFT address')}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openInExplorer(character.nft_address!)}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Metadata URI */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">METADATA_URI</div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono bg-muted/50 border border-primary/10 px-2 py-1 rounded flex-1 break-all text-primary">
                  https://earth.ndao.computer/player/{character.id}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(
                    `https://earth.ndao.computer/player/${character.id}`,
                    'Metadata URI'
                  )}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(
                    `https://earth.ndao.computer/player/${character.id}`,
                    '_blank'
                  )}
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Collection Info */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">SYMBOL</div>
                <div className="text-primary font-bold font-mono">PLAYER</div>
              </div>
              <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">ROYALTY</div>
                <div className="text-primary font-bold font-mono">5%</div>
              </div>
              <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">STANDARD</div>
                <div className="text-primary font-bold font-mono">METAPLEX</div>
              </div>
              <div className="bg-muted/20 border border-primary/10 rounded p-2 text-center">
                <div className="text-muted-foreground mb-1">MUTABLE</div>
                <div className="text-success font-bold font-mono">TRUE</div>
              </div>
            </div>

            {/* Created Date */}
            <div>
              <div className="text-muted-foreground text-xs mb-1">GENESIS_TIMESTAMP</div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-primary">{new Date(character.created_at).toLocaleDateString()}</span>
                <span className="text-muted-foreground">
                  {new Date(character.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Equipped Items */}
      {character.inventory.filter(item => item.is_equipped).length > 0 && (
        <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
          <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
            ACTIVE_EQUIPMENT_LOADOUT
          </div>

          <div className="space-y-2">
            {character.inventory
              .filter(item => item.is_equipped)
              .map((item) => (
                <div
                  key={item.id}
                  className="bg-muted/20 border border-primary/10 rounded p-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-primary/20 border border-primary/20 rounded flex items-center justify-center">
                      <Package className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <div className="text-primary font-bold text-xs font-mono">{item.item.name.toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {item.item.category}_{item.item.rarity}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.is_primary && (
                      <Badge variant="default" className="text-xs bg-yellow-500 font-mono">
                        PRIMARY
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs font-mono">
                      QTY_{item.quantity}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Burn Character Section */}
      <BurnCharacter character={character} onCharacterCreated={onCharacterUpdated} />
    </div>
  )

  // Character assessment algorithms based on observed behaviors and choices
  const calculateCharacterMetrics = () => {
    // Base calculations from observable data
    const healthStability = character.health / 100
    const energyBalance = character.energy / 100
    const resourceWisdom = Math.min(1, character.earth / 5000)
    const experientialDepth = Math.min(1, (character.experience || 0) / 1000)
    const levelProgression = Math.min(1, character.level / 20)
    const storyEngagement = storyFlagStats ? Math.min(1, storyFlagStats.totalFlags / 50) : 0

    const metrics = {
      // Spiritual direction and moral compass
      trajectory: (levelProgression + experientialDepth + storyEngagement) / 3,
      
      // Alignment with higher principles and truth
      resonance: (healthStability + energyBalance + (character.level > 5 ? 0.3 : 0)) / 2.3,
      
      // Balance between competing desires and impulses
      equilibrium: (healthStability + energyBalance + resourceWisdom) / 3,
      
      // Spiritual discernment and seeing truth clearly
      clarity: (experientialDepth + storyEngagement + (character.level / 20)) / 3,
      
      // Fervor, devotion, and commitment to chosen path
      intensity: (energyBalance + levelProgression + (storyFlagStats?.totalFlags > 10 ? 0.4 : 0)) / 2.4,
      
      // Integrity and consistency between beliefs and actions
      coherence: (resourceWisdom + experientialDepth + (character.earth > 100 && character.health > 50 ? 0.3 : 0)) / 2.3
    }

    // Overall character assessment
    const overallBearing = Object.values(metrics).reduce((sum, metric) => sum + metric, 0) / Object.keys(metrics).length

    return { ...metrics, overallBearing }
  }

  const getCharacterObservation = (value: number) => {
    if (value >= 0.8) return { label: 'PRONOUNCED', color: 'text-success', tendency: 'strong inclination toward' }
    if (value >= 0.6) return { label: 'EVIDENT', color: 'text-primary', tendency: 'clear tendency toward' }
    if (value >= 0.4) return { label: 'DEVELOPING', color: 'text-muted-foreground', tendency: 'shows signs of' }
    if (value >= 0.2) return { label: 'EMERGING', color: 'text-yellow-500', tendency: 'early indications of' }
    return { label: 'UNCERTAIN', color: 'text-error', tendency: 'struggles with' }
  }

  const renderCharacterAssessment = () => {
    const metrics = calculateCharacterMetrics()
    
    return (
      <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="text-primary font-bold">CHARACTER MATRIX v2.089</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 animate-pulse" />
            <span className="text-primary text-xs">BEHAVIORAL_ANALYSIS_ACTIVE</span>
          </div>
        </div>

        {/* Subject Classification */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
          <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            OBSERVATIONAL_SUMMARY
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-muted-foreground mb-1">BEHAVIORAL_ARCHETYPE</div>
              <div className="text-primary font-bold">
                {character.character_type === 'survivor' ? 'ENDURANCE_ORIENTED' : 
                 character.character_type === 'scavenger' ? 'ACQUISITION_FOCUSED' :
                 character.character_type === 'nomad' ? 'EXPLORATION_DRIVEN' :
                 'PATTERN_INDETERMINATE'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">OVERALL_BEARING</div>
              <div className={`font-bold ${getCharacterObservation(metrics.overallBearing).color}`}>
                {getCharacterObservation(metrics.overallBearing).label}
              </div>
            </div>
          </div>
        </div>

        {/* Character Metrics Analysis */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
          <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            CHARACTER_ASSESSMENT_MATRIX
          </div>
          
          <div className="space-y-4">
            {[
              { key: 'trajectory', label: 'TRAJECTORY', icon: TrendingUp, description: 'Overall direction and purposefulness of choices' },
              { key: 'resonance', label: 'RESONANCE', icon: Activity, description: 'Alignment with deeper principles and values' },
              { key: 'equilibrium', label: 'EQUILIBRIUM', icon: Target, description: 'Balance between competing impulses and desires' },
              { key: 'clarity', label: 'CLARITY', icon: Award, description: 'Discernment and understanding of situations' },
              { key: 'intensity', label: 'INTENSITY', icon: Zap, description: 'Commitment and fervor in chosen directions' },
              { key: 'coherence', label: 'COHERENCE', icon: Shield, description: 'Consistency between beliefs and actions' },
            ].map(({ key, label, icon: Icon, description }) => {
              const value = metrics[key as keyof typeof metrics]
              const observation = getCharacterObservation(value)
              
              return (
                <div key={key} className="bg-muted/20 border border-primary/10 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-primary">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs font-mono ${observation.color}`}>
                        {observation.label}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Subtle indication bar instead of percentage */}
                  <div className="w-full bg-muted/50 rounded-full h-1 mb-2">
                    <div
                      className="bg-primary/60 h-1 rounded-full transition-all"
                      style={{ width: `${value * 100}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-1">{description}</div>
                  <div className="text-xs text-primary/80 italic">
                    Subject {observation.tendency} {label.toLowerCase()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Observational Notes */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
          <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            OBSERVATIONAL_PATTERNS
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-muted/20 border border-primary/10 rounded p-3">
              <div className="text-muted-foreground mb-1">APPROACH_TO_UNCERTAINTY</div>
              <div className="text-primary font-bold">
                {character.health > 80 ? 'BOLD_ENGAGEMENT' :
                 character.health > 60 ? 'MEASURED_APPROACH' :
                 character.health > 40 ? 'CAUTIOUS_DELIBERATION' : 'HESITANT_WITHDRAWAL'}
              </div>
            </div>
            
            <div className="bg-muted/20 border border-primary/10 rounded p-3">
              <div className="text-muted-foreground mb-1">RELATIONAL_ORIENTATION</div>
              <div className="text-primary font-bold">
                {character.level > 10 ? 'COMMUNITY_FOCUSED' :
                 character.level > 5 ? 'SELECTIVE_COOPERATION' :
                 'INDIVIDUAL_CENTERED'}
              </div>
            </div>
            
            <div className="bg-muted/20 border border-primary/10 rounded p-3">
              <div className="text-muted-foreground mb-1">MATERIAL_RELATIONSHIP</div>
              <div className="text-primary font-bold">
                {character.earth > 5000 ? 'ABUNDANCE_ORIENTED' :
                 character.earth > 1000 ? 'STEWARDSHIP_MINDED' :
                 character.earth > 100 ? 'SUBSISTENCE_FOCUSED' : 'SCARCITY_DRIVEN'}
              </div>
            </div>
            
            <div className="bg-muted/20 border border-primary/10 rounded p-3">
              <div className="text-muted-foreground mb-1">RESPONSE_TO_CHANGE</div>
              <div className="text-primary font-bold">
                {character.energy > 80 ? 'EMBRACES_TRANSFORMATION' :
                 character.energy > 60 ? 'ADAPTS_DELIBERATELY' :
                 character.energy > 40 ? 'RESISTS_INITIALLY' : 'AVOIDS_DISRUPTION'}
              </div>
            </div>
          </div>
        </div>

        {/* Story Progression Analysis */}
        {storyFlagStats && (
          <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
            <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              NARRATIVE_PROGRESSION_ANALYSIS
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-muted/20 border border-primary/10 rounded p-3 text-center">
                <div className="text-muted-foreground text-xs mb-1">TOTAL_STORY_FLAGS</div>
                <div className="text-primary font-bold text-lg">{storyFlagStats.totalFlags}</div>
                <div className="text-xs text-muted-foreground">DECISIONS_MADE</div>
              </div>
              
              <div className="bg-muted/20 border border-primary/10 rounded p-3 text-center">
                <div className="text-muted-foreground text-xs mb-1">ACTIVE_STORYLINES</div>
                <div className="text-primary font-bold text-lg">{Object.keys(storyFlagStats.flagsByStory).length}</div>
                <div className="text-xs text-muted-foreground">CONCURRENT_ARCS</div>
              </div>
              
              <div className="bg-muted/20 border border-primary/10 rounded p-3 text-center">
                <div className="text-muted-foreground text-xs mb-1">CHAPTERS_TOUCHED</div>
                <div className="text-primary font-bold text-lg">{Object.keys(storyFlagStats.flagsByChapter).length}</div>
                <div className="text-xs text-muted-foreground">PROGRESSION_DEPTH</div>
              </div>
            </div>

            {/* Recent Story Decisions */}
            {storyFlagStats.recentFlags.length > 0 && (
              <div>
                <div className="text-muted-foreground text-xs mb-2">RECENT_NARRATIVE_DECISIONS</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {storyFlagStats.recentFlags.slice(0, 5).map((flag, index) => (
                    <div key={index} className="bg-muted/10 border border-primary/5 rounded p-2 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-primary font-mono">{flag.flag_name.toUpperCase()}</span>
                        {flag.story_id && (
                          <span className="text-muted-foreground ml-2">({flag.story_id})</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {flag.chapter_acquired && `Ch.${flag.chapter_acquired}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assessment Observations */}
        <div className="bg-muted/30 border border-primary/20 rounded p-4">
          <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            BEHAVIORAL_OBSERVATIONS
          </div>
          
          <div className="space-y-2 text-xs">
            {metrics.overallBearing < 0.4 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                <div className="text-yellow-600 font-bold">⚠ PATTERN_UNCERTAINTY</div>
                <div className="text-muted-foreground">
                  Subject shows fluctuating behavioral patterns. Consider focus on fundamental stability
                </div>
              </div>
            )}
            
            {metrics.trajectory > 0.7 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                <div className="text-blue-600 font-bold">⬆ ASCENDING_TRAJECTORY</div>
                <div className="text-muted-foreground">
                  Clear upward progression observed. Subject demonstrates purposeful development
                </div>
              </div>
            )}
            
            {metrics.coherence > 0.7 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
                <div className="text-green-600 font-bold">🔗 ALIGNED_COHERENCE</div>
                <div className="text-muted-foreground">
                  Strong consistency between expressed values and observed actions
                </div>
              </div>
            )}
            
            {metrics.resonance > 0.6 && metrics.clarity > 0.6 && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2">
                <div className="text-purple-600 font-bold">✨ HEIGHTENED_AWARENESS</div>
                <div className="text-muted-foreground">
                  Subject demonstrates both discernment and alignment with deeper principles
                </div>
              </div>
            )}
            
            {storyFlagStats && storyFlagStats.totalFlags > 20 && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-2">
                <div className="text-cyan-600 font-bold">📖 EXTENSIVE_TESTING</div>
                <div className="text-muted-foreground">
                  Subject has undergone numerous trials. Behavioral patterns show depth and complexity
                </div>
              </div>
            )}
            
            {storyFlagStats && Object.keys(storyFlagStats.flagsByStory).length > 3 && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded p-2">
                <div className="text-indigo-600 font-bold">🌐 MULTI_DIMENSIONAL_ENGAGEMENT</div>
                <div className="text-muted-foreground">
                  Active participation across multiple narrative threads indicates complex integration
                </div>
              </div>
            )}
            
            {storyFlagStats && storyFlagStats.totalFlags === 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2">
                <div className="text-amber-600 font-bold">🌟 UNTESTED_POTENTIAL</div>
                <div className="text-muted-foreground">
                  Character matrix incomplete. Recommend exposure to meaningful choice scenarios
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-primary/20 pt-2 mt-4 flex justify-between text-xs text-muted-foreground/60">
          <span>CHARACTER_MATRIX_v2089</span>
          <span>ASSESSMENT_TIME: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    )
  }

  const renderWalletInfo = () => (
    <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span className="text-primary font-bold">WALLET INTERFACE v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          {walletInfo.connected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={walletInfo.refreshBalance}
              disabled={walletInfo.loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw
                className={`w-3 h-3 ${walletInfo.loading ? 'animate-spin' : ''}`}
              />
            </Button>
          )}
          <Badge variant="outline" className="text-xs font-mono">
            {isDevnet ? 'DEVNET' : 'MAINNET'}
          </Badge>
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">{walletInfo.connected ? 'LINKED' : 'OFFLINE'}</span>
        </div>
      </div>

      {walletInfo.connected ? (
        <div className="space-y-4">
          {/* Wallet Provider */}
          <div className="bg-muted/30 border border-primary/20 rounded p-3">
            <div className="text-muted-foreground text-xs mb-1">WALLET_PROVIDER</div>
            <div className="text-primary font-bold font-mono">{walletInfo.walletName?.toUpperCase()}</div>
          </div>

          {/* Wallet Address */}
          <div className="bg-muted/30 border border-primary/20 rounded p-3">
            <div className="text-muted-foreground text-xs mb-2">WALLET_ADDRESS</div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-mono bg-muted/50 border border-primary/10 px-2 py-1 rounded flex-1 break-all text-primary">
                {walletInfo.fullAddress}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(walletInfo.fullAddress!, 'Wallet address')}
                className="h-6 w-6 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openInExplorer(walletInfo.fullAddress!)}
                className="h-6 w-6 p-0"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Balance Display */}
          <div className="bg-muted/30 border border-primary/20 rounded p-4">
            <div className="text-muted-foreground text-xs mb-3 flex items-center justify-between">
              <span>SOL_BALANCE</span>
              <Badge variant="outline" className="text-xs font-mono">
                {isDevnet ? 'DEVNET' : 'MAINNET'}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-mono text-primary mb-2">
                {walletInfo.loading ? (
                  <span className="text-muted-foreground text-lg">SYNCING...</span>
                ) : (
                  <span>{walletInfo.balance?.toFixed(4) || '0.0000'}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-mono">SOL_TOKENS</div>
            </div>
          </div>

          {/* Network Status */}
          <div className="bg-muted/30 border border-primary/20 rounded p-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="text-center">
                <div className="text-muted-foreground mb-1">NETWORK_STATUS</div>
                <div className="text-success font-bold font-mono">ONLINE</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground mb-1">CONNECTION</div>
                <div className="text-success font-bold font-mono">SECURE</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border border-primary/20 rounded p-8 text-center">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <div className="text-muted-foreground font-mono mb-2">
            <div className="text-lg mb-2">NO_WALLET_DETECTED</div>
            <div className="text-sm">CONNECT_SOLANA_WALLET_TO_ACCESS</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 mt-4 flex justify-between text-xs text-muted-foreground/60">
        <span>WALLET_INTERFACE_v2089</span>
        <span>LAST_SYNC: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )

  const renderStoryFlags = () => (
    <div className="bg-background border border-primary/30 rounded-lg p-4 font-mono">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          <span className="text-primary font-bold">STORY FLAGS DATABASE v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Flag className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">ACQUIRED: {allStoryFlags.length}</span>
        </div>
      </div>

      {/* Summary Stats */}
      {storyFlagStats && (
        <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
          <div className="text-muted-foreground text-xs mb-3">ACQUISITION_SUMMARY</div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <div className="text-primary font-bold text-lg">{storyFlagStats.totalFlags}</div>
              <div className="text-muted-foreground">TOTAL_FLAGS</div>
            </div>
            <div className="text-center">
              <div className="text-primary font-bold text-lg">{Object.keys(storyFlagStats.flagsByStory).length}</div>
              <div className="text-muted-foreground">ACTIVE_STORIES</div>
            </div>
            <div className="text-center">
              <div className="text-primary font-bold text-lg">{Object.keys(storyFlagStats.flagsByChapter).length}</div>
              <div className="text-muted-foreground">CHAPTERS_TOUCHED</div>
            </div>
          </div>
        </div>
      )}

      {/* Story Flags List */}
      <div className="bg-muted/30 border border-primary/20 rounded p-4 mb-4">
        <div className="text-muted-foreground text-xs mb-3 flex items-center gap-2">
          <Flag className="w-4 h-4" />
          ALL_ACQUIRED_FLAGS ({allStoryFlags.length})
        </div>

        {allStoryFlags.length === 0 ? (
          <div className="text-center py-8">
            <Flag className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <div className="text-muted-foreground font-mono mb-2">
              <div className="text-lg mb-2">NO_STORY_FLAGS_ACQUIRED</div>
              <div className="text-sm">BEGIN_PLAYING_TO_UNLOCK_STORY_PROGRESSION</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allStoryFlags.map((flag, index) => (
              <div key={index} className="bg-muted/20 border border-primary/10 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-primary font-bold text-sm font-mono">
                      {flag.flag_name.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {flag.story_id && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {flag.story_id.toUpperCase()}
                      </Badge>
                    )}
                    {flag.chapter_acquired && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        CH.{flag.chapter_acquired}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Flag Value */}
                <div className="mb-2">
                  <div className="text-muted-foreground text-xs mb-1">FLAG_VALUE</div>
                  <div className="text-xs font-mono bg-muted/50 border border-primary/10 px-2 py-1 rounded">
                    {typeof flag.flag_value === 'boolean' 
                      ? flag.flag_value ? 'TRUE' : 'FALSE'
                      : typeof flag.flag_value === 'object'
                      ? JSON.stringify(flag.flag_value)
                      : String(flag.flag_value)
                    }
                  </div>
                </div>

                {/* Metadata */}
                {flag.metadata && (
                  <div className="mb-2">
                    <div className="text-muted-foreground text-xs mb-1">METADATA</div>
                    <div className="text-xs font-mono bg-muted/50 border border-primary/10 px-2 py-1 rounded">
                      {JSON.stringify(flag.metadata, null, 2)}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-1">ACQUIRED</div>
                    <div className="text-primary font-mono">
                      {new Date(flag.acquired_at).toLocaleDateString()}
                    </div>
                  </div>
                  {flag.expires_at && (
                    <div>
                      <div className="text-muted-foreground mb-1">EXPIRES</div>
                      <div className="text-primary font-mono">
                        {new Date(flag.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 flex justify-between text-xs text-muted-foreground/60">
        <span>STORY_FLAGS_DATABASE_v2089</span>
        <span>LAST_SCAN: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-4xl mx-auto bg-background border border-primary/30 rounded-lg p-4 font-mono text-primary">
      {/* Terminal Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/20 pb-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span className="text-primary font-bold">PROFILE ACCESS TERMINAL v2.089</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 animate-pulse" />
          <span className="text-primary text-xs">AUTHENTICATED</span>
        </div>
      </div>

      {/* Tabbed Navigation */}
      <Tabs defaultValue="character" className="w-full">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max h-10 p-1 bg-muted/50">
            <TabsTrigger value="character" className="text-xs font-mono flex-shrink-0 px-4">
              <User className="w-3 h-3 mr-2" />
              DOSSIER
            </TabsTrigger>
            <TabsTrigger value="psych" className="text-xs font-mono flex-shrink-0 px-4">
              <Brain className="w-3 h-3 mr-2" />
              PSYCH_PROFILE
            </TabsTrigger>
            <TabsTrigger value="story-flags" className="text-xs font-mono flex-shrink-0 px-4">
              <BookOpen className="w-3 h-3 mr-2" />
              STORY_FLAGS
            </TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs font-mono flex-shrink-0 px-4">
              <Wallet className="w-3 h-3 mr-2" />
              WALLET_INTERFACE
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="character" className="mt-4">
          {renderCharacterProfile()}
        </TabsContent>

        <TabsContent value="psych" className="mt-4">
          {renderCharacterAssessment()}
        </TabsContent>

        <TabsContent value="story-flags" className="mt-4">
          {renderStoryFlags()}
        </TabsContent>

        <TabsContent value="wallet" className="mt-4">
          {renderWalletInfo()}
        </TabsContent>

      </Tabs>

      {/* Footer */}
      <div className="border-t border-primary/20 pt-2 mt-4 flex justify-between text-xs text-muted-foreground/60">
        <span>PROFILE_ACCESS_TERMINAL_v2089</span>
        <span>SESSION_TIME: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
