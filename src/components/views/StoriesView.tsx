// src/components/views/StoriesView.tsx - Stories browser for players
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Play, CheckCircle, BookOpen } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import type { Character } from '@/types'
import { Tables } from '@/types/supabase'

type Story = Tables<'stories'>
type Chapter = Tables<'chapters'>

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

interface StoriesViewProps {
  character: Character
  onPlayChapter: (chapter: Chapter) => void
}

export function StoriesView({ character, onPlayChapter }: StoriesViewProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [chapters, setChapters] = useState<Record<string, Chapter[]>>({})
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [, forceUpdate] = useState({})

  useEffect(() => {
    loadStories()
  }, [])

  // Force re-render when character's completed chapters change
  useEffect(() => {
    console.log('Character completed_chapters updated:', character.completed_chapters)
    forceUpdate({})
  }, [character.completed_chapters])

  const loadStories = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) {
      setStories(data)

      // Load chapters for all stories
      const chapterPromises = data.map(story =>
        supabase
          .from('chapters')
          .select('*')
          .eq('story_id', story.id)
          .order('chapter_number', { ascending: true })
      )

      const chapterResults = await Promise.all(chapterPromises)
      const chapterMap: Record<string, Chapter[]> = {}

      data.forEach((story, index) => {
        chapterMap[story.id] = chapterResults[index].data || []
      })

      setChapters(chapterMap)
    }

    setLoading(false)
  }

  const isStoryUnlocked = (story: Story) => {
    const minLevel = (story as any).min_level || 1
    return character.level >= minLevel
  }

  const isChapterUnlocked = (chapter: Chapter) => {
    const minLevel = (chapter as any).min_level || 1
    return character.level >= minLevel
  }

  const isChapterCompleted = (chapter: Chapter) => {
    const completedChapters = character.completed_chapters || []
    return completedChapters.includes(chapter.id)
  }

  const isStoryCompleted = (story: Story) => {
    const storyChapters = chapters[story.id] || []
    return storyChapters.length > 0 && storyChapters.every(ch => isChapterCompleted(ch))
  }

  const getNextPlayableChapter = (story: Story): Chapter | null => {
    const storyChapters = chapters[story.id] || []
    // Find first chapter that is unlocked but not completed
    return storyChapters.find(ch => isChapterUnlocked(ch) && !isChapterCompleted(ch)) || null
  }

  const getStoryStats = (story: Story) => {
    const storyChapters = chapters[story.id] || []
    const total = storyChapters.length
    const completed = storyChapters.filter(ch => isChapterCompleted(ch)).length
    const available = storyChapters.filter(ch => isChapterUnlocked(ch)).length
    return { total, completed, available }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-muted-foreground">Loading stories...</div>
      </div>
    )
  }

  // Story detail view
  if (selectedStory) {
    const storyChapters = chapters[selectedStory.id] || []
    const completedChapters = storyChapters.filter(ch => isChapterCompleted(ch))
    const availableChapters = storyChapters.filter(ch => !isChapterCompleted(ch))
    const nextPlayable = getNextPlayableChapter(selectedStory)
    const stats = getStoryStats(selectedStory)

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setSelectedStory(null)}
            className="mb-2"
          >
            ← Back to Stories
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {selectedStory.title}
                {isStoryCompleted(selectedStory) && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </h2>
              <p className="text-muted-foreground mt-1">{selectedStory.description}</p>
            </div>
          </div>

          {/* Progress Stats */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Total Chapters:</span>{' '}
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Available:</span>{' '}
              <span className="font-semibold">{stats.available}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Completed:</span>{' '}
              <span className="font-semibold text-green-500">{stats.completed}</span>
            </div>
          </div>
        </div>

        {/* Chapters Tabs */}
        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">
              Available ({availableChapters.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedChapters.length})
            </TabsTrigger>
          </TabsList>

          {/* Available Chapters */}
          <TabsContent value="available" className="space-y-4 mt-4">
            {availableChapters.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                All chapters completed!
              </div>
            ) : (
              availableChapters.map((chapter) => {
                const unlocked = isChapterUnlocked(chapter)
                const minLevel = (chapter as any).min_level || 1
                const isNextPlayable = nextPlayable?.id === chapter.id

                return (
                  <Card
                    key={chapter.id}
                    className={`${!unlocked ? 'opacity-60' : ''} ${isNextPlayable ? 'border-primary' : ''}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            Chapter {chapter.chapter_number}: {chapter.title}
                            {!unlocked && (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            )}
                          </CardTitle>
                          <CardDescription>{chapter.description}</CardDescription>
                        </div>

                        {!unlocked && (
                          <Badge variant="outline">
                            Level {minLevel} Required
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    {isNextPlayable && (
                      <CardContent>
                        <Button
                          onClick={() => onPlayChapter(chapter)}
                          size="sm"
                          className="w-full"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Play Chapter
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                )
              })
            )}
          </TabsContent>

          {/* Completed Chapters */}
          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedChapters.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No chapters completed yet
              </div>
            ) : (
              completedChapters.map((chapter) => (
                <Card
                  key={chapter.id}
                  className="border-green-500/30 bg-green-500/5"
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Chapter {chapter.chapter_number}: {chapter.title}
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </CardTitle>
                    <CardDescription>{chapter.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Story list view
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Stories</h2>
        <p className="text-muted-foreground">Explore the world through interactive stories</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {stories.map((story) => {
          const unlocked = isStoryUnlocked(story)
          const completed = isStoryCompleted(story)
          const minLevel = (story as any).min_level || 1
          const stats = getStoryStats(story)

          return (
            <Card
              key={story.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${!unlocked ? 'opacity-60 cursor-not-allowed' : ''} ${completed ? 'border-green-500/30' : ''}`}
              onClick={() => unlocked && setSelectedStory(story)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      {story.title}
                      {completed && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {!unlocked && (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2">{story.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                {!unlocked ? (
                  <Badge variant="outline">
                    <Lock className="w-3 h-3 mr-1" />
                    Requires Level {minLevel}
                  </Badge>
                ) : (
                  <>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground">{stats.total}</span> chapters
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">{stats.available}</span> available
                      </div>
                      <div>
                        <span className="font-semibold text-green-500">{stats.completed}</span> completed
                      </div>
                    </div>

                    {completed && (
                      <Badge variant="outline" className="bg-green-500/20 text-green-500">
                        Story Complete!
                      </Badge>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {stories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No stories available yet
        </div>
      )}
    </div>
  )
}
