// src/types/story-types.ts - Comprehensive story system data models

export interface PlayerVariable {
  id: string
  type: 'boolean' | 'number' | 'string' | 'array' | 'object'
  value: any
  description: string
  category: 'character' | 'world' | 'relationship' | 'inventory' | 'achievement'
}

export interface StoryCondition {
  type: 'variable' | 'level' | 'location' | 'inventory' | 'time' | 'relationship' | 'completion' | 'custom'
  operator: 'equals' | 'not_equals' | 'greater' | 'less' | 'contains' | 'not_contains' | 'exists' | 'not_exists'
  target: string // variable name, item id, story id, etc.
  value?: any
  description?: string
}

export interface StoryConsequence {
  type: 'variable' | 'inventory' | 'relationship' | 'unlock' | 'world_state' | 'custom'
  target: string
  action: 'set' | 'add' | 'subtract' | 'multiply' | 'append' | 'remove' | 'toggle'
  value: any
  description: string
  immediate?: boolean // Execute immediately vs. after story completion
}

export interface StoryChoice {
  id: string
  text: string
  shortText?: string // For UI/history display
  consequences: StoryConsequence[]
  conditions?: StoryCondition[]
  leadsTo?: string // Next scene ID
  variant?: 'default' | 'destructive' | 'secondary' | 'success' | 'warning'
  disabled?: boolean
  tooltip?: string
  cost?: { // Resource cost to choose this option
    type: 'gold' | 'energy' | 'health' | 'item'
    amount: number
    itemId?: string
  }
}

export interface StoryScene {
  id: string
  title?: string
  content: string | string[] // String or array for multi-paragraph content
  type: 'text' | 'choice' | 'skill_check' | 'dice_roll' | 'puzzle' | 'mini_game' | 'consequence' | 'fork' | 'merge'
  
  // Navigation
  choices?: StoryChoice[]
  autoAdvance?: {
    delay: number // milliseconds
    toScene: string
  }
  canDismiss?: boolean
  
  // Conditions and consequences
  entryConditions?: StoryCondition[]
  exitConsequences?: StoryConsequence[]
  
  // Interactive elements
  skillCheck?: {
    skill: string
    difficulty: number
    successScene?: string
    failureScene?: string
    consequences?: {
      success: StoryConsequence[]
      failure: StoryConsequence[]
    }
  }
  
  // Visual/Audio
  background?: string
  music?: string
  visualEffects?: string[]
  
  // Metadata
  tags?: string[]
  notes?: string // Developer notes
  lastModified?: string
  author?: string
}

export interface StoryChapter {
  id: string
  title: string
  description: string
  scenes: StoryScene[]
  startScene: string
  
  // Prerequisites and unlocking
  prerequisites?: StoryCondition[]
  unlocks?: string[] // Other chapter/story IDs this unlocks
  
  // Categorization
  storyId: string // Parent story
  order: number
  isOptional: boolean
  
  // Rewards
  completionRewards?: StoryConsequence[]
  
  // Metadata
  estimatedDuration?: number // minutes
  difficulty?: 'easy' | 'medium' | 'hard'
  themes?: string[] // Tags like 'combat', 'social', 'puzzle'
}

export interface Story {
  id: string
  title: string
  description: string
  synopsis?: string
  
  // Structure
  chapters: StoryChapter[]
  startChapter: string
  
  // Requirements
  minimumLevel?: number
  prerequisites?: StoryCondition[]
  
  // Classification
  category: 'main' | 'side' | 'character' | 'location' | 'random_event' | 'seasonal'
  priority: 'critical' | 'high' | 'medium' | 'low'
  
  // Rewards and consequences
  completionRewards?: StoryConsequence[]
  
  // Metadata
  version: string
  author: string
  estimatedLength?: string // "Short", "Medium", "Long"
  contentWarnings?: string[]
  lastUpdated: string
}

// Player progress tracking
export interface PlayerStoryProgress {
  playerId: string
  
  // Story completion tracking
  completedStories: Set<string>
  completedChapters: Set<string>
  completedScenes: Set<string>
  
  // Current progress
  activeStories: Map<string, string> // storyId -> currentChapterId
  activeChapters: Map<string, string> // chapterId -> currentSceneId
  
  // Choice history for consequences and references
  choiceHistory: Array<{
    storyId: string
    chapterId: string
    sceneId: string
    choiceId: string
    timestamp: Date
    consequences: StoryConsequence[]
  }>
  
  // Variables set by stories
  variables: Map<string, PlayerVariable>
  
  // Relationship tracking
  relationships: Map<string, number> // characterId/factionId -> relationship value
  
  // Unlocked content
  unlockedStories: Set<string>
  unlockedChapters: Set<string>
  unlockedLocations: Set<string>
  
  // Statistics
  totalStoriesCompleted: number
  totalChoicesMade: number
  playtimeInStories: number // milliseconds
  
  // Achievements/flags
  flags: Set<string> // Special achievement flags set by stories
}

// Story flow management
export interface StoryFlow {
  currentStory?: string
  currentChapter?: string
  currentScene?: string
  
  // Flow control
  sceneHistory: Array<{
    storyId: string
    chapterId: string
    sceneId: string
    timestamp: Date
  }>
  
  // Branching and merging
  pendingBranches: Array<{
    branchId: string
    alternateScenes: string[]
    mergePoint?: string
  }>
  
  // Saved states for complex branching
  savePoints: Map<string, {
    storyState: any
    playerState: any
    timestamp: Date
  }>
}

// Developer tools types
export interface StoryAnalytics {
  storyId: string
  
  // Player engagement
  startedCount: number
  completedCount: number
  abandonedAtScene: Map<string, number>
  averageCompletionTime: number
  
  // Choice distribution
  choiceDistribution: Map<string, Map<string, number>> // sceneId -> choiceId -> count
  
  // Popular paths
  popularPaths: Array<{
    scenes: string[]
    frequency: number
    averageRating?: number
  }>
  
  // Problems
  deadEnds: string[] // Scene IDs that players get stuck at
  skippedScenes: string[] // Scenes bypassed due to conditions
  
  // Performance
  loadTimes: Map<string, number> // sceneId -> average load time
  
  lastAnalyzed: Date
}

// Content management
export interface StoryTemplate {
  id: string
  name: string
  description: string
  category: string
  
  // Template structure
  sceneTemplates: Array<{
    type: StoryScene['type']
    defaultTitle?: string
    defaultContent?: string
    defaultChoices?: Omit<StoryChoice, 'id'>[]
    tags?: string[]
  }>
  
  // Default consequences and conditions
  commonConsequences: StoryConsequence[]
  commonConditions: StoryCondition[]
  
  // Variables this template typically uses
  recommendedVariables: Omit<PlayerVariable, 'value'>[]
}

// Export all types
export type {
  StoryCondition,
  StoryConsequence, 
  StoryChoice,
  StoryScene,
  StoryChapter,
  Story,
  PlayerStoryProgress,
  StoryFlow,
  StoryAnalytics,
  StoryTemplate
}