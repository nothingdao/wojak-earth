// src/hooks/useStoryManager.ts - React hook for story management
import { useState, useEffect, useCallback } from 'react'
import { StoryManager } from '@/utils/story-manager'
import { Story, StoryChapter, StoryScene, PlayerStoryProgress } from '@/types/story-types'

// Global story manager instance (singleton pattern)
let globalStoryManager: StoryManager | null = null

export function useStoryManager(playerId: string) {
  const [, forceUpdate] = useState({})
  
  // Initialize story manager if it doesn't exist or player changed
  useEffect(() => {
    if (!globalStoryManager || globalStoryManager.getDebugInfo()?.playerProgress?.playerId !== playerId) {
      globalStoryManager = new StoryManager(playerId)
      forceUpdate({})
    }
  }, [playerId])

  // Force component re-render when story state changes
  const triggerUpdate = useCallback(() => {
    forceUpdate({})
  }, [])

  // === STORY OPERATIONS ===
  
  const addStory = useCallback((story: Story) => {
    globalStoryManager?.addStory(story)
    triggerUpdate()
  }, [triggerUpdate])

  const getStory = useCallback((storyId: string) => {
    return globalStoryManager?.getStory(storyId)
  }, [])

  const getAllStories = useCallback(() => {
    if (!globalStoryManager) return []
    return globalStoryManager.getAllStories()
  }, [])

  const getStoriesByCategory = useCallback((category: Story['category']) => {
    return globalStoryManager?.getStoriesByCategory(category) || []
  }, [])

  const updateStory = useCallback((storyId: string, updates: Partial<Story>) => {
    const success = globalStoryManager?.updateStory(storyId, updates)
    if (success) triggerUpdate()
    return success
  }, [triggerUpdate])

  const removeStory = useCallback((storyId: string) => {
    const success = globalStoryManager?.removeStory(storyId)
    if (success) triggerUpdate()
    return success
  }, [triggerUpdate])

  // === STORY FLOW ===

  const startStory = useCallback((storyId: string) => {
    const success = globalStoryManager?.startStory(storyId)
    if (success) triggerUpdate()
    return success
  }, [triggerUpdate])

  const playCurrentScene = useCallback(() => {
    return globalStoryManager?.playCurrentScene()
  }, [])

  const navigateToScene = useCallback((sceneId: string) => {
    const success = globalStoryManager?.navigateToScene(sceneId)
    if (success) triggerUpdate()
    return success
  }, [triggerUpdate])

  // === PLAYER PROGRESS ===

  const getPlayerProgress = useCallback((): PlayerStoryProgress | undefined => {
    if (!globalStoryManager) return undefined
    return globalStoryManager.getDebugInfo()?.playerProgress
  }, [])

  const setPlayerVariable = useCallback((id: string, value: any, type?: any, category?: any) => {
    globalStoryManager?.setPlayerVariable(id, value, type, category)
    triggerUpdate()
  }, [triggerUpdate])

  const getPlayerVariable = useCallback((id: string) => {
    return globalStoryManager?.getPlayerVariable(id)
  }, [])

  const isStoryCompleted = useCallback((storyId: string) => {
    if (!globalStoryManager) return false
    const progress = globalStoryManager.getDebugInfo()?.playerProgress
    return progress?.completedStories.has(storyId) || false
  }, [])

  const isStoryUnlocked = useCallback((storyId: string) => {
    if (!globalStoryManager) return false
    const progress = globalStoryManager.getDebugInfo()?.playerProgress
    return progress?.unlockedStories.has(storyId) || false
  }, [])

  // === CONTENT MANAGEMENT ===

  const addChapter = useCallback((storyId: string, chapter: StoryChapter) => {
    const success = globalStoryManager?.addChapter(storyId, chapter)
    if (success) triggerUpdate()
    return success
  }, [triggerUpdate])

  const addScene = useCallback((storyId: string, chapterId: string, scene: StoryScene) => {
    const success = globalStoryManager?.addScene(storyId, chapterId, scene)
    if (success) triggerUpdate()
    return success
  }, [triggerUpdate])

  const updateChapter = useCallback((storyId: string, chapterId: string, updates: Partial<StoryChapter>) => {
    const success = globalStoryManager?.updateChapter(storyId, chapterId, updates)
    if (success) triggerUpdate()
    return success
  }, [triggerUpdate])

  const updateScene = useCallback((storyId: string, chapterId: string, sceneId: string, updates: Partial<StoryScene>) => {
    const success = globalStoryManager?.updateScene(storyId, chapterId, sceneId, updates)
    if (success) triggerUpdate()
    return success
  }, [triggerUpdate])

  // === ANALYTICS ===

  const getAnalytics = useCallback((storyId: string) => {
    return globalStoryManager?.getAnalytics(storyId)
  }, [])

  // === DEVELOPER TOOLS ===

  const exportStories = useCallback(() => {
    return globalStoryManager?.exportStories()
  }, [])

  const importStories = useCallback((jsonData: string) => {
    const success = globalStoryManager?.importStories(jsonData)
    if (success) triggerUpdate()
    return success
  }, [triggerUpdate])

  const getDebugInfo = useCallback(() => {
    if (!globalStoryManager) return null
    return globalStoryManager.getDebugInfo()
  }, [])

  // === CONVENIENCE METHODS ===

  const triggerStoryIfAvailable = useCallback((storyId: string) => {
    const story = getStory(storyId)
    if (!story) return false

    // Check if story can be started
    const progress = getPlayerProgress()
    if (!progress) return false

    // Check if already completed and is one-time only
    if (story.category === 'main' && progress.completedStories.has(storyId)) {
      return false
    }

    // Check prerequisites if any
    if (story.prerequisites) {
      const canStart = globalStoryManager?.evaluateConditions(story.prerequisites)
      if (!canStart) return false
    }

    return startStory(storyId)
  }, [getStory, getPlayerProgress, startStory])

  const getAvailableStories = useCallback(() => {
    if (!globalStoryManager) return []
    const allStories = globalStoryManager.getAllStories()
    const progress = globalStoryManager.getDebugInfo()?.playerProgress
    if (!progress) return []

    return allStories.filter(story => {
      // Check if unlocked
      if (!progress.unlockedStories.has(story.id)) return false
      
      // Check if already completed (for one-time stories)
      if (story.category === 'main' && progress.completedStories.has(story.id)) return false
      
      // Check prerequisites
      if (story.prerequisites) {
        return globalStoryManager?.evaluateConditions(story.prerequisites) || false
      }
      
      return true
    })
  }, [])

  const getRecommendedStories = useCallback(() => {
    if (!globalStoryManager) return []
    const available = getAvailableStories()
    return available
      .filter(story => story.priority === 'high' || story.priority === 'critical')
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
  }, [getAvailableStories])

  return {
    // Story operations
    addStory,
    getStory,
    getAllStories,
    getStoriesByCategory,
    updateStory,
    removeStory,
    
    // Story flow
    startStory,
    playCurrentScene,
    navigateToScene,
    triggerStoryIfAvailable,
    
    // Player progress
    getPlayerProgress,
    setPlayerVariable,
    getPlayerVariable,
    isStoryCompleted,
    isStoryUnlocked,
    
    // Content management
    addChapter,
    addScene,
    updateChapter,
    updateScene,
    
    // Analytics
    getAnalytics,
    
    // Developer tools
    exportStories,
    importStories,
    getDebugInfo,
    
    // Convenience methods
    getAvailableStories,
    getRecommendedStories,
    
    // Direct access to manager (for advanced use)
    manager: globalStoryManager
  }
}

// Hook for quick story triggering without full manager access
export function useStoryTrigger(playerId: string) {
  const { triggerStoryIfAvailable, getAvailableStories, isStoryCompleted } = useStoryManager(playerId)
  
  return {
    triggerStory: triggerStoryIfAvailable,
    getAvailableStories,
    isCompleted: isStoryCompleted
  }
}

// Hook for story analytics and metrics
export function useStoryAnalytics(playerId: string) {
  const { getAnalytics, getDebugInfo, getPlayerProgress } = useStoryManager(playerId)
  
  const getAllAnalytics = useCallback(() => {
    if (!globalStoryManager) return []
    const debug = globalStoryManager.getDebugInfo()
    return debug?.analytics || []
  }, [])
  
  const getPlayerStats = useCallback(() => {
    if (!globalStoryManager) return null
    const progress = globalStoryManager.getDebugInfo()?.playerProgress
    if (!progress) return null
    
    return {
      storiesCompleted: progress.totalStoriesCompleted,
      choicesMade: progress.totalChoicesMade,
      playtime: progress.playtimeInStories,
      activeStories: progress.activeStories.size,
      unlockedContent: {
        stories: progress.unlockedStories.size,
        chapters: progress.unlockedChapters.size,
        locations: progress.unlockedLocations.size
      }
    }
  }, [])
  
  return {
    getAnalytics,
    getAllAnalytics,
    getPlayerStats,
    getDebugInfo
  }
}

export default useStoryManager