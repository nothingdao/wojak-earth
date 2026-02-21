// src/utils/story-system.ts - Story progression and management
import { showStoryDialog, type StoryScreen, type StoryChoice } from '@/components/ui/story-dialog'

export interface StoryMilestone {
  id: string
  title: string
  trigger: 'level' | 'location' | 'item' | 'action' | 'time' | 'manual'
  condition?: any
  screens: StoryScreen[]
  oneTime?: boolean
  prerequisites?: string[]
}

// Story progression tracking
class StorySystemManager {
  private completedStories = new Set<string>()
  private availableStories: StoryMilestone[] = []

  // Register story milestones
  registerStories(stories: StoryMilestone[]) {
    this.availableStories = [...this.availableStories, ...stories]
  }

  // Check if story has been completed
  isCompleted(storyId: string): boolean {
    return this.completedStories.has(storyId)
  }

  // Mark story as completed
  markCompleted(storyId: string) {
    this.completedStories.add(storyId)
    localStorage.setItem('earth_completed_stories', JSON.stringify([...this.completedStories]))
  }

  // Load completed stories from storage
  loadProgress() {
    const saved = localStorage.getItem('earth_completed_stories')
    if (saved) {
      this.completedStories = new Set(JSON.parse(saved))
    }
  }

  // Trigger story if conditions are met
  checkAndTriggerStory(storyId: string, context?: any) {
    const story = this.availableStories.find(s => s.id === storyId)
    if (!story) return false

    // Skip if already completed and is one-time only
    if (story.oneTime && this.isCompleted(storyId)) return false

    // Check prerequisites
    if (story.prerequisites?.some(prereq => !this.isCompleted(prereq))) return false

    // Show the story
    this.showStory(story)
    return true
  }

  private showStory(story: StoryMilestone) {
    showStoryDialog({
      screens: story.screens,
      storyId: story.id,
      onComplete: () => {
        this.markCompleted(story.id)
      }
    })
  }
}

// Global story system instance
export const storySystem = new StorySystemManager()

// Convenient story creation helpers
export const createStoryScreens = {
  // Simple text screen
  text: (content: string, title?: string, onContinue?: () => void): StoryScreen => ({
    title,
    content,
    continueText: 'CONTINUE',
    onContinue
  }),

  // Choice screen
  choice: (content: string, choices: StoryChoice[], title?: string): StoryScreen => ({
    title,
    content,
    choices,
    canDismiss: false // Force choice
  }),

  // Final screen
  final: (content: string, title?: string, onComplete?: () => void): StoryScreen => ({
    title,
    content,
    continueText: 'UNDERSTOOD',
    onContinue: onComplete
  })
}

// Pre-built story examples
export const gameStories: StoryMilestone[] = [
  {
    id: 'welcome',
    title: 'WELCOME TO EARTH',
    trigger: 'manual',
    oneTime: true,
    screens: [
      createStoryScreens.text(
        `Welcome, traveler.\n\nYou have arrived on Earth - a world of endless possibilities and hidden dangers.\n\nYour journey begins now.`,
        'SYSTEM INITIALIZATION'
      ),
      createStoryScreens.choice(
        `What drives you to explore this vast world?`,
        [
          {
            text: 'Seek knowledge and discovery',
            action: () => console.log('Chosen: Explorer path')
          },
          {
            text: 'Build wealth and power',
            action: () => console.log('Chosen: Merchant path')
          },
          {
            text: 'Forge alliances and friendships',
            action: () => console.log('Chosen: Social path')
          }
        ],
        'CHARACTER MOTIVATION'
      )
    ]
  },

  {
    id: 'first_level',
    title: 'LEVEL UP',
    trigger: 'level',
    condition: { level: 2 },
    oneTime: true,
    prerequisites: ['welcome'],
    screens: [
      createStoryScreens.text(
        `Congratulations! You have grown stronger.\n\nWith each level gained, new areas of Earth become accessible to you.\n\nThe world expands as your capabilities grow.`,
        'ADVANCEMENT ACHIEVED'
      ),
      createStoryScreens.final(
        `Remember: Power without wisdom is dangerous.\n\nChoose your path carefully.`,
        'ANCIENT WARNING'
      )
    ]
  },

  {
    id: 'equipment_discovery',
    title: 'FIRST EQUIPMENT',
    trigger: 'item',
    oneTime: true,
    screens: [
      createStoryScreens.text(
        `You have discovered your first piece of equipment!\n\nEquipment not only changes your appearance but can provide special abilities and protection.\n\nManage your inventory wisely.`,
        'EQUIPMENT DISCOVERED'
      )
    ]
  }
]

// Initialize the story system
storySystem.registerStories(gameStories)
storySystem.loadProgress()

// Export for easy triggering
export const triggerStory = (storyId: string, context?: any) => 
  storySystem.checkAndTriggerStory(storyId, context)