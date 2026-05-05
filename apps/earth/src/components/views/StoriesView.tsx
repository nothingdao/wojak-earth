// src/components/views/StoriesView.tsx - Migrated to Convex
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Play, CheckCircle, BookOpen } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Character } from '@/types'

interface Story {
  _id: string
  id: string
  title: string
  characterPath: string
  description?: string | null
  createdAt: number
  min_level?: number
}

interface Chapter {
  _id: string
  id: string
  storyId: string
  title?: string
  chapterNumber?: number
  min_level?: number
}

interface StoriesViewProps {
  character: Character
  onPlayChapter: (chapter: Chapter) => void
}

export function StoriesView({ character, onPlayChapter }: StoriesViewProps) {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)

  const rawStories = useQuery(api.earth.stories.list, {})
  const stories: Story[] = (rawStories ?? []).map((s: any) => ({
    _id: s._id,
    id: s._id,
    title: s.title,
    characterPath: s.characterPath,
    description: s.description ?? null,
    createdAt: s.createdAt,
  }))

  const rawFull = useQuery(
    api.earth.stories.getWithChapters,
    selectedStory ? { storyId: selectedStory._id as any } : 'skip'
  )

  const chapters: Chapter[] = ((rawFull as any)?.chapters ?? []).map((c: any) => ({
    _id: c._id,
    id: c._id,
    storyId: selectedStory?._id ?? '',
    title: c.title,
    chapterNumber: c.chapterNumber,
  }))

  const loading = rawStories === undefined

  const isStoryUnlocked = (story: Story) => {
    const minLevel = story.min_level ?? 1
    return character.level >= minLevel
  }

  const isChapterUnlocked = (chapter: Chapter) => {
    const minLevel = chapter.min_level ?? 1
    return character.level >= minLevel
  }

  const isChapterCompleted = (chapterId: string) => {
    return (character.completed_chapters ?? []).includes(chapterId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Stories</h2>
      </div>

      {stories.length === 0 ? (
        <p className="text-muted-foreground text-sm">No stories available yet.</p>
      ) : (
        <Tabs defaultValue={stories[0]?._id}>
          <TabsList className="flex-wrap h-auto">
            {stories.map((story) => (
              <TabsTrigger key={story._id} value={story._id} onClick={() => setSelectedStory(story)}>
                {story.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {stories.map((story) => (
            <TabsContent key={story._id} value={story._id}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{story.title}</CardTitle>
                    {!isStoryUnlocked(story) && (
                      <Badge variant="secondary">
                        <Lock className="w-3 h-3 mr-1" />
                        Level {story.min_level ?? 1}+
                      </Badge>
                    )}
                  </div>
                  {story.description && (
                    <CardDescription>{story.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedStory?._id === story._id && chapters.length > 0 ? (
                    <div className="space-y-2">
                      {chapters.map((chapter) => {
                        const completed = isChapterCompleted(chapter._id)
                        const unlocked = isChapterUnlocked(chapter)
                        return (
                          <div key={chapter._id}
                            className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              {completed ? (
                                <CheckCircle className="w-4 h-4 text-success" />
                              ) : unlocked ? (
                                <Play className="w-4 h-4 text-primary" />
                              ) : (
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              )}
                              <span className="text-sm">
                                {chapter.title ?? `Chapter ${chapter.chapterNumber ?? 1}`}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              disabled={!unlocked || !isStoryUnlocked(story)}
                              onClick={() => onPlayChapter(chapter)}
                            >
                              {completed ? 'Replay' : 'Play'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setSelectedStory(story)}>
                      View Chapters
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
