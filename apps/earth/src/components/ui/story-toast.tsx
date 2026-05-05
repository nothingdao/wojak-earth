// src/components/ui/story-toast.tsx - Immersive story dialog system
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

export interface StoryChoice {
  text: string
  action: () => void
  variant?: 'default' | 'destructive' | 'secondary'
}

export interface StoryScreen {
  title?: string
  content: string
  choices?: StoryChoice[]
  continueText?: string
  onContinue?: () => void
  canDismiss?: boolean
}

export interface StoryToastProps {
  screens: StoryScreen[]
  onComplete?: () => void
  onDismiss?: () => void
  storyId?: string
}

export function StoryToast({ screens, onComplete, onDismiss, storyId }: StoryToastProps) {
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0)
  const currentScreen = screens[currentScreenIndex]
  const isLastScreen = currentScreenIndex === screens.length - 1
  const isFirstScreen = currentScreenIndex === 0

  const handleNext = () => {
    if (isLastScreen) {
      onComplete?.()
    } else {
      setCurrentScreenIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstScreen) {
      setCurrentScreenIndex(prev => prev - 1)
    }
  }

  const handleChoice = (choice: StoryChoice) => {
    choice.action()
    // Choices typically complete the story flow
    onComplete?.()
  }

  const handleDismiss = () => {
    if (currentScreen.canDismiss !== false) {
      onDismiss?.()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        {/* Story Dialog Container */}
        <div className="bg-background border-2 border-primary/30 rounded-lg shadow-2xl font-mono">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-primary/20 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-primary font-bold text-sm">
                {currentScreen.title || 'STORY_TRANSMISSION'}
              </span>
              {storyId && (
                <Badge variant="outline" className="text-xs font-mono">
                  {storyId.toUpperCase()}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Screen Progress */}
              {screens.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{currentScreenIndex + 1}</span>
                  <span>/</span>
                  <span>{screens.length}</span>
                </div>
              )}
              
              {/* Dismiss Button */}
              {currentScreen.canDismiss !== false && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Story Content */}
          <div className="p-6 space-y-4 min-h-[200px] max-h-[400px] overflow-y-auto">
            <div className="text-foreground leading-relaxed text-sm whitespace-pre-wrap">
              {currentScreen.content}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="p-4 border-t border-primary/20 bg-muted/20">
            {/* Choices */}
            {currentScreen.choices && currentScreen.choices.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground mb-3 font-mono">
                  CHOOSE_YOUR_ACTION:
                </div>
                <div className="grid gap-2">
                  {currentScreen.choices.map((choice, index) => (
                    <Button
                      key={index}
                      variant={choice.variant || 'outline'}
                      onClick={() => handleChoice(choice)}
                      className="justify-start text-left font-mono text-xs h-auto py-2 px-3"
                    >
                      <ChevronRight className="w-3 h-3 mr-2 flex-shrink-0" />
                      {choice.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            {!currentScreen.choices && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isFirstScreen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevious}
                      className="font-mono text-xs"
                    >
                      <ChevronLeft className="w-3 h-3 mr-1" />
                      BACK
                    </Button>
                  )}
                </div>

                <Button
                  onClick={currentScreen.onContinue || handleNext}
                  className="font-mono text-xs"
                  variant={isLastScreen ? 'default' : 'outline'}
                >
                  {currentScreen.continueText || (isLastScreen ? 'COMPLETE' : 'CONTINUE')}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Story toast manager using React portals
let storyToastRoot: HTMLElement | null = null

// Helper function to show story toasts using portals
export function showStoryToast(props: Omit<StoryToastProps, 'onDismiss'>) {
  // Create portal root if it doesn't exist
  if (!storyToastRoot) {
    storyToastRoot = document.createElement('div')
    storyToastRoot.id = 'story-toast-root'
    document.body.appendChild(storyToastRoot)
  }

  // Component to render in portal
  function PortalStoryToast() {
    const [isVisible, setIsVisible] = useState(true)

    const cleanup = () => {
      setIsVisible(false)
      setTimeout(() => {
        if (storyToastRoot && document.body.contains(storyToastRoot)) {
          document.body.removeChild(storyToastRoot)
          storyToastRoot = null
        }
      }, 300) // Allow for exit animation
    }

    if (!isVisible) return null

    return createPortal(
      <StoryToast
        {...props}
        onDismiss={cleanup}
        onComplete={() => {
          props.onComplete?.()
          cleanup()
        }}
      />,
      storyToastRoot!
    )
  }

  // This is a bit of a hack, but we need to render the component
  // Let's create a temporary container and use React's render method
  const tempContainer = document.createElement('div')
  document.body.appendChild(tempContainer)
  
  // Import and use createRoot
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(tempContainer)
    root.render(<PortalStoryToast />)
    
    // Clean up temp container after portal is created
    setTimeout(() => {
      document.body.removeChild(tempContainer)
      root.unmount()
    }, 100)
  })

  // Return cleanup function
  return () => {
    if (storyToastRoot && document.body.contains(storyToastRoot)) {
      document.body.removeChild(storyToastRoot)
      storyToastRoot = null
    }
  }
}

// Example usage and types export
export type { StoryScreen, StoryChoice, StoryToastProps }