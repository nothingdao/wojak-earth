// src/utils/story-manager.ts - Comprehensive story management system
import { 
  Story, 
  StoryChapter, 
  StoryScene, 
  StoryChoice,
  PlayerStoryProgress, 
  StoryFlow, 
  StoryCondition, 
  StoryConsequence,
  PlayerVariable,
  StoryAnalytics,
  StoryTemplate
} from '@/types/story-types'
import { showStoryDialog } from '@/components/ui/story-dialog'

export class StoryManager {
  private stories = new Map<string, Story>()
  private templates = new Map<string, StoryTemplate>()
  private playerProgress: PlayerStoryProgress
  private storyFlow: StoryFlow = {
    sceneHistory: [],
    pendingBranches: [],
    savePoints: new Map()
  }
  private analytics = new Map<string, StoryAnalytics>()

  constructor(playerId: string) {
    this.playerProgress = this.initializePlayerProgress(playerId)
    try {
      this.loadFromStorage()
    } catch (error) {
      console.error('Error loading story data:', error)
      // Continue with default empty state
    }
  }

  // === STORY CRUD OPERATIONS ===

  addStory(story: Story): void {
    this.stories.set(story.id, story)
    this.saveToStorage()
    this.initializeAnalytics(story.id)
  }

  getStory(storyId: string): Story | undefined {
    return this.stories.get(storyId)
  }

  updateStory(storyId: string, updates: Partial<Story>): boolean {
    const story = this.stories.get(storyId)
    if (!story) return false
    
    this.stories.set(storyId, { ...story, ...updates, lastUpdated: new Date().toISOString() })
    this.saveToStorage()
    return true
  }

  removeStory(storyId: string): boolean {
    const removed = this.stories.delete(storyId)
    if (removed) {
      this.analytics.delete(storyId)
      this.saveToStorage()
    }
    return removed
  }

  getAllStories(): Story[] {
    return Array.from(this.stories.values())
  }

  getStoriesByCategory(category: Story['category']): Story[] {
    return this.getAllStories().filter(story => story.category === category)
  }

  // === CHAPTER MANAGEMENT ===

  addChapter(storyId: string, chapter: StoryChapter): boolean {
    const story = this.stories.get(storyId)
    if (!story) return false

    story.chapters.push(chapter)
    this.saveToStorage()
    return true
  }

  updateChapter(storyId: string, chapterId: string, updates: Partial<StoryChapter>): boolean {
    const story = this.stories.get(storyId)
    if (!story) return false

    const chapterIndex = story.chapters.findIndex(c => c.id === chapterId)
    if (chapterIndex === -1) return false

    story.chapters[chapterIndex] = { ...story.chapters[chapterIndex], ...updates }
    this.saveToStorage()
    return true
  }

  // === SCENE MANAGEMENT ===

  addScene(storyId: string, chapterId: string, scene: StoryScene): boolean {
    const story = this.stories.get(storyId)
    if (!story) return false

    const chapter = story.chapters.find(c => c.id === chapterId)
    if (!chapter) return false

    chapter.scenes.push(scene)
    this.saveToStorage()
    return true
  }

  updateScene(storyId: string, chapterId: string, sceneId: string, updates: Partial<StoryScene>): boolean {
    const story = this.stories.get(storyId)
    if (!story) return false

    const chapter = story.chapters.find(c => c.id === chapterId)
    if (!chapter) return false

    const sceneIndex = chapter.scenes.findIndex(s => s.id === sceneId)
    if (sceneIndex === -1) return false

    chapter.scenes[sceneIndex] = { ...chapter.scenes[sceneIndex], ...updates }
    this.saveToStorage()
    return true
  }

  // === CONDITION EVALUATION ===

  evaluateCondition(condition: StoryCondition): boolean {
    switch (condition.type) {
      case 'variable': {
        const variable = this.playerProgress.variables.get(condition.target)
        if (!variable) return condition.operator === 'not_exists'
        
        switch (condition.operator) {
          case 'equals': return variable.value === condition.value
          case 'not_equals': return variable.value !== condition.value
          case 'greater': return variable.value > condition.value
          case 'less': return variable.value < condition.value
          case 'contains': return String(variable.value).includes(String(condition.value))
          case 'not_contains': return !String(variable.value).includes(String(condition.value))
          case 'exists': return true
          case 'not_exists': return false
          default: return false
        }
      }
      
      case 'completion': {
        const isCompleted = this.playerProgress.completedStories.has(condition.target)
        return condition.operator === 'exists' ? isCompleted : !isCompleted
      }
      
      // Add more condition types as needed
      default:
        console.warn(`Unhandled condition type: ${condition.type}`)
        return false
    }
  }

  evaluateConditions(conditions: StoryCondition[]): boolean {
    return conditions.every(condition => this.evaluateCondition(condition))
  }

  // === CONSEQUENCE EXECUTION ===

  executeConsequence(consequence: StoryConsequence): void {
    switch (consequence.type) {
      case 'variable': {
        const existingVar = this.playerProgress.variables.get(consequence.target)
        let newValue = consequence.value

        if (existingVar && consequence.action !== 'set') {
          switch (consequence.action) {
            case 'add':
              newValue = existingVar.value + consequence.value
              break
            case 'subtract':
              newValue = existingVar.value - consequence.value
              break
            case 'multiply':
              newValue = existingVar.value * consequence.value
              break
            case 'toggle':
              newValue = !existingVar.value
              break
          }
        }

        this.setPlayerVariable(consequence.target, newValue)
        break
      }
      
      case 'unlock': {
        if (consequence.action === 'add') {
          this.playerProgress.unlockedStories.add(consequence.target)
        }
        break
      }
      
      // Add more consequence types as needed
      default:
        console.warn(`Unhandled consequence type: ${consequence.type}`)
    }
  }

  executeConsequences(consequences: StoryConsequence[]): void {
    consequences.forEach(consequence => {
      if (consequence.immediate !== false) {
        this.executeConsequence(consequence)
      }
    })
  }

  // === PLAYER PROGRESS MANAGEMENT ===

  setPlayerVariable(id: string, value: any, type?: PlayerVariable['type'], category?: PlayerVariable['category']): void {
    const variable: PlayerVariable = {
      id,
      type: type || (typeof value as PlayerVariable['type']),
      value,
      description: `Variable ${id}`,
      category: category || 'character'
    }
    
    this.playerProgress.variables.set(id, variable)
    this.saveProgress()
  }

  getPlayerVariable(id: string): PlayerVariable | undefined {
    return this.playerProgress.variables.get(id)
  }

  markStoryCompleted(storyId: string): void {
    this.playerProgress.completedStories.add(storyId)
    this.playerProgress.totalStoriesCompleted++
    this.saveProgress()
    this.updateAnalytics(storyId, 'completed')
  }

  markChapterCompleted(chapterId: string): void {
    this.playerProgress.completedChapters.add(chapterId)
    this.saveProgress()
  }

  markSceneCompleted(sceneId: string): void {
    this.playerProgress.completedScenes.add(sceneId)
    this.saveProgress()
  }

  recordChoice(storyId: string, chapterId: string, sceneId: string, choiceId: string, consequences: StoryConsequence[]): void {
    this.playerProgress.choiceHistory.push({
      storyId,
      chapterId,
      sceneId,
      choiceId,
      timestamp: new Date(),
      consequences
    })
    this.playerProgress.totalChoicesMade++
    this.saveProgress()
    this.updateAnalytics(storyId, 'choice', { sceneId, choiceId })
  }

  // === STORY FLOW MANAGEMENT ===

  startStory(storyId: string): boolean {
    const story = this.getStory(storyId)
    if (!story) return false

    // Check prerequisites
    if (story.prerequisites && !this.evaluateConditions(story.prerequisites)) {
      return false
    }

    this.storyFlow.currentStory = storyId
    this.storyFlow.currentChapter = story.startChapter
    
    const startChapter = story.chapters.find(c => c.id === story.startChapter)
    if (startChapter) {
      this.storyFlow.currentScene = startChapter.startScene
    }

    this.playerProgress.activeStories.set(storyId, story.startChapter)
    this.saveProgress()
    this.updateAnalytics(storyId, 'started')
    return true
  }

  playCurrentScene(): boolean {
    if (!this.storyFlow.currentStory || !this.storyFlow.currentChapter || !this.storyFlow.currentScene) {
      return false
    }

    const story = this.getStory(this.storyFlow.currentStory)
    if (!story) return false

    const chapter = story.chapters.find(c => c.id === this.storyFlow.currentChapter)
    if (!chapter) return false

    const scene = chapter.scenes.find(s => s.id === this.storyFlow.currentScene)
    if (!scene) return false

    // Check entry conditions
    if (scene.entryConditions && !this.evaluateConditions(scene.entryConditions)) {
      console.warn(`Scene ${scene.id} entry conditions not met`)
      return false
    }

    // Record scene visit
    this.storyFlow.sceneHistory.push({
      storyId: this.storyFlow.currentStory,
      chapterId: this.storyFlow.currentChapter,
      sceneId: this.storyFlow.currentScene,
      timestamp: new Date()
    })

    // Convert scene to dialog format and show
    this.showScene(scene, story.id, chapter.id)
    return true
  }

  private showScene(scene: StoryScene, storyId: string, chapterId: string): void {
    const dialogChoices = scene.choices?.map(choice => ({
      text: choice.text,
      variant: choice.variant,
      action: () => {
        // Execute choice consequences
        this.executeConsequences(choice.consequences)
        
        // Record choice
        this.recordChoice(storyId, chapterId, scene.id, choice.id, choice.consequences)
        
        // Navigate to next scene if specified
        if (choice.leadsTo) {
          this.navigateToScene(choice.leadsTo)
        }
      }
    }))

    showStoryDialog({
      screens: [{
        title: scene.title,
        content: Array.isArray(scene.content) ? scene.content.join('\n\n') : scene.content,
        choices: dialogChoices,
        canDismiss: scene.canDismiss
      }],
      storyId,
      onComplete: () => {
        // Execute exit consequences
        if (scene.exitConsequences) {
          this.executeConsequences(scene.exitConsequences)
        }
        
        // Mark scene as completed
        this.markSceneCompleted(scene.id)
        
        // Auto-advance if specified
        if (scene.autoAdvance) {
          setTimeout(() => {
            this.navigateToScene(scene.autoAdvance!.toScene)
          }, scene.autoAdvance.delay)
        }
      }
    })
  }

  navigateToScene(sceneId: string): boolean {
    if (!this.storyFlow.currentStory || !this.storyFlow.currentChapter) return false

    const story = this.getStory(this.storyFlow.currentStory)
    if (!story) return false

    const chapter = story.chapters.find(c => c.id === this.storyFlow.currentChapter)
    if (!chapter) return false

    const scene = chapter.scenes.find(s => s.id === sceneId)
    if (!scene) return false

    this.storyFlow.currentScene = sceneId
    this.playCurrentScene()
    return true
  }

  // === ANALYTICS ===

  private initializeAnalytics(storyId: string): void {
    this.analytics.set(storyId, {
      storyId,
      startedCount: 0,
      completedCount: 0,
      abandonedAtScene: new Map(),
      averageCompletionTime: 0,
      choiceDistribution: new Map(),
      popularPaths: [],
      deadEnds: [],
      skippedScenes: [],
      loadTimes: new Map(),
      lastAnalyzed: new Date()
    })
  }

  private updateAnalytics(storyId: string, event: 'started' | 'completed' | 'choice', data?: any): void {
    const analytics = this.analytics.get(storyId)
    if (!analytics) return

    switch (event) {
      case 'started':
        analytics.startedCount++
        break
      case 'completed':
        analytics.completedCount++
        break
      case 'choice':
        if (data?.sceneId && data?.choiceId) {
          const sceneChoices = analytics.choiceDistribution.get(data.sceneId) || new Map()
          sceneChoices.set(data.choiceId, (sceneChoices.get(data.choiceId) || 0) + 1)
          analytics.choiceDistribution.set(data.sceneId, sceneChoices)
        }
        break
    }

    analytics.lastAnalyzed = new Date()
  }

  getAnalytics(storyId: string): StoryAnalytics | undefined {
    return this.analytics.get(storyId)
  }

  // === TEMPLATES ===

  addTemplate(template: StoryTemplate): void {
    this.templates.set(template.id, template)
    this.saveToStorage()
  }

  getTemplate(templateId: string): StoryTemplate | undefined {
    return this.templates.get(templateId)
  }

  createStoryFromTemplate(templateId: string, storyData: Partial<Story>): Story | null {
    const template = this.getTemplate(templateId)
    if (!template) return null

    // Create story from template logic would go here
    // This is a simplified version
    const story: Story = {
      id: storyData.id || `story_${Date.now()}`,
      title: storyData.title || template.name,
      description: storyData.description || template.description,
      chapters: [],
      startChapter: '',
      category: storyData.category || 'side',
      priority: storyData.priority || 'medium',
      version: '1.0.0',
      author: storyData.author || 'Unknown',
      lastUpdated: new Date().toISOString(),
      ...storyData
    }

    return story
  }

  // === PERSISTENCE ===

  private initializePlayerProgress(playerId: string): PlayerStoryProgress {
    return {
      playerId,
      completedStories: new Set(),
      completedChapters: new Set(),
      completedScenes: new Set(),
      activeStories: new Map(),
      activeChapters: new Map(),
      choiceHistory: [],
      variables: new Map(),
      relationships: new Map(),
      unlockedStories: new Set(),
      unlockedChapters: new Set(),
      unlockedLocations: new Set(),
      totalStoriesCompleted: 0,
      totalChoicesMade: 0,
      playtimeInStories: 0,
      flags: new Set()
    }
  }

  private saveToStorage(): void {
    const storiesData = Array.from(this.stories.entries())
    const templatesData = Array.from(this.templates.entries())
    const analyticsData = Array.from(this.analytics.entries())

    localStorage.setItem('earth_stories', JSON.stringify(storiesData))
    localStorage.setItem('earth_story_templates', JSON.stringify(templatesData))
    localStorage.setItem('earth_story_analytics', JSON.stringify(analyticsData))
  }

  private saveProgress(): void {
    const progressData = {
      ...this.playerProgress,
      completedStories: Array.from(this.playerProgress.completedStories),
      completedChapters: Array.from(this.playerProgress.completedChapters),
      completedScenes: Array.from(this.playerProgress.completedScenes),
      activeStories: Array.from(this.playerProgress.activeStories.entries()),
      activeChapters: Array.from(this.playerProgress.activeChapters.entries()),
      variables: Array.from(this.playerProgress.variables.entries()),
      relationships: Array.from(this.playerProgress.relationships.entries()),
      unlockedStories: Array.from(this.playerProgress.unlockedStories),
      unlockedChapters: Array.from(this.playerProgress.unlockedChapters),
      unlockedLocations: Array.from(this.playerProgress.unlockedLocations),
      flags: Array.from(this.playerProgress.flags)
    }

    localStorage.setItem(`earth_player_progress_${this.playerProgress.playerId}`, JSON.stringify(progressData))
  }

  private loadFromStorage(): void {
    try {
      // Load stories
      const storiesData = localStorage.getItem('earth_stories')
      if (storiesData) {
        const entries = JSON.parse(storiesData)
        this.stories = new Map(entries)
      }

      // Load templates
      const templatesData = localStorage.getItem('earth_story_templates')
      if (templatesData) {
        const entries = JSON.parse(templatesData)
        this.templates = new Map(entries)
      }

      // Load analytics
      const analyticsData = localStorage.getItem('earth_story_analytics')
      if (analyticsData) {
        const entries = JSON.parse(analyticsData)
        this.analytics = new Map(entries)
      }

      // Load player progress
      const progressData = localStorage.getItem(`earth_player_progress_${this.playerProgress.playerId}`)
      if (progressData) {
        const data = JSON.parse(progressData)
        this.playerProgress = {
          ...data,
          completedStories: new Set(data.completedStories),
          completedChapters: new Set(data.completedChapters),
          completedScenes: new Set(data.completedScenes),
          activeStories: new Map(data.activeStories),
          activeChapters: new Map(data.activeChapters),
          variables: new Map(data.variables),
          relationships: new Map(data.relationships),
          unlockedStories: new Set(data.unlockedStories),
          unlockedChapters: new Set(data.unlockedChapters),
          unlockedLocations: new Set(data.unlockedLocations),
          flags: new Set(data.flags)
        }
      }
    } catch (error) {
      console.error('Error loading story data from storage:', error)
    }
  }

  // === DEVELOPER UTILITIES ===

  exportStories(): string {
    return JSON.stringify(Array.from(this.stories.values()), null, 2)
  }

  importStories(jsonData: string): boolean {
    try {
      const stories: Story[] = JSON.parse(jsonData)
      stories.forEach(story => this.addStory(story))
      return true
    } catch (error) {
      console.error('Error importing stories:', error)
      return false
    }
  }

  getDebugInfo(): any {
    return {
      totalStories: this.stories.size,
      totalTemplates: this.templates.size,
      playerProgress: this.playerProgress,
      currentFlow: this.storyFlow,
      analytics: Array.from(this.analytics.values())
    }
  }
}

// Create global story manager instance
export const createStoryManager = (playerId: string) => new StoryManager(playerId)

// Default export
export default StoryManager