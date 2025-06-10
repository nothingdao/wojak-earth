import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, Radio, Loader2, SkipForward, Shuffle } from 'lucide-react'
import type { Track, RadioStation, LocalRadioProps } from '@/types'

export const LocalRadio: React.FC<LocalRadioProps> = ({
  location_id,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [shuffledPlaylist, setShuffledPlaylist] = useState<Track[]>([])
  const [isShuffled, setIsShuffled] = useState(true) // Default to shuffled
  const [error, setError] = useState<string | null>(null)
  const [trackMetadata, setTrackMetadata] = useState<{ [key: string]: any }>({})

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Shuffle array helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  const loadTrackMetadata = async (track: Track) => {
    if (!audioRef.current) return

    try {
      // Set the source and wait for metadata to load
      audioRef.current.src = track.url

      await new Promise((resolve, reject) => {
        const onLoadedMetadata = () => {
          const audio = audioRef.current!
          const metadata = {
            duration: audio.duration,
            // Try to get title from the audio element's metadata (limited support)
            title: (audio as any).title || track.name,
            artist: (audio as any).artist || 'Unknown Artist'
          }

          setTrackMetadata(prev => ({
            ...prev,
            [track.id]: metadata
          }))

          console.log('Loaded metadata for', track.name, ':', metadata)

          audio.removeEventListener('loadedmetadata', onLoadedMetadata)
          audio.removeEventListener('error', onError)
          resolve(void 0)
        }

        const onError = () => {
          audio.removeEventListener('loadedmetadata', onLoadedMetadata)
          audio.removeEventListener('error', onError)
          reject(new Error('Failed to load metadata'))
        }

        audioRef.current!.addEventListener('loadedmetadata', onLoadedMetadata)
        audioRef.current!.addEventListener('error', onError)

        // Trigger metadata loading
        audioRef.current!.load()
      })
    } catch (error) {
      console.log('Could not load metadata for', track.name, ':', error)
      // Fallback metadata
      setTrackMetadata(prev => ({
        ...prev,
        [track.id]: {
          title: track.name,
          artist: 'Unknown Artist',
          duration: 0
        }
      }))
    }
  }

  // Load radio station for location
  useEffect(() => {
    const loadRadioStation = async () => {
      try {
        setError(null)
        setIsPlaying(false)
        const response = await fetch(`/.netlify/functions/get-local-radio?location_id=${location_id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.station && data.station.playlist) {
            setCurrentStation(data.station)
            // Always start with a shuffled playlist
            const shuffled = shuffleArray(data.station.playlist)
            setShuffledPlaylist(shuffled)
            setCurrentTrackIndex(0)
            console.log('Loaded station with playlist:', data.station.name, `(${data.station.playlist.length} tracks)`)
            console.log('Shuffled playlist:', shuffled.map(t => t.name))

            // Load metadata for the first track
            if (shuffled.length > 0) {
              loadTrackMetadata(shuffled[0])
            }
          } else {
            setCurrentStation(null)
            setShuffledPlaylist([])
          }
        } else {
          console.error('Failed to load radio station:', response.status)
          setError('Failed to load station')
        }
      } catch (error) {
        console.error('Failed to load radio station:', error)
        setError('Connection error')
      }
    }

    loadRadioStation()
  }, [location_id])

  // Get current track
  const getCurrentTrack = (): Track | null => {
    const playlist = isShuffled ? shuffledPlaylist : (currentStation?.playlist || [])
    return playlist[currentTrackIndex] || null
  }

  const playCurrentTrack = async () => {
    const track = getCurrentTrack()
    if (!audioRef.current || !track) return

    try {
      setIsLoading(true)
      setError(null)

      console.log(`Playing track ${currentTrackIndex + 1}: ${track.name}`)

      // Load metadata if we don't have it yet
      if (!trackMetadata[track.id]) {
        await loadTrackMetadata(track)
      }

      audioRef.current.src = track.url
      audioRef.current.volume = 0.7

      await audioRef.current.play()
      setIsPlaying(true)
      console.log('Track started playing successfully')
    } catch (error) {
      console.error('Error playing track:', error as Error)
      setError('Playback failed')
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Go to next track
  const nextTrack = () => {
    const playlist = isShuffled ? shuffledPlaylist : (currentStation?.playlist || [])
    const nextIndex = (currentTrackIndex + 1) % playlist.length
    setCurrentTrackIndex(nextIndex)
  }

  // Toggle shuffle
  const toggleShuffle = () => {
    setIsShuffled(!isShuffled)
    if (!isShuffled) {
      // Shuffling: create new shuffled playlist
      if (currentStation?.playlist) {
        const shuffled = shuffleArray(currentStation.playlist)
        setShuffledPlaylist(shuffled)
        setCurrentTrackIndex(0)
      }
    } else {
      // Un-shuffling: find current track in original playlist
      const currentTrack = getCurrentTrack()
      if (currentTrack && currentStation?.playlist) {
        const originalIndex = currentStation.playlist.findIndex(track => track.id === currentTrack.id)
        setCurrentTrackIndex(originalIndex >= 0 ? originalIndex : 0)
      }
    }
  }

  // Remove the complex useEffects that were causing issues
  // We'll handle track changes manually in onEnded and handleNext

  const handlePlay = () => {
    if (!isPlaying) {
      playCurrentTrack()
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const handleNext = async () => {
    const playlist = isShuffled ? shuffledPlaylist : (currentStation?.playlist || [])
    const nextIndex = (currentTrackIndex + 1) % playlist.length
    const nextTrack = playlist[nextIndex]

    if (nextTrack && audioRef.current) {
      setCurrentTrackIndex(nextIndex)

      try {
        console.log(`Manually skipping to: ${nextTrack.name}`)
        setIsLoading(true)
        audioRef.current.src = nextTrack.url
        audioRef.current.volume = 0.7

        if (isPlaying) {
          await audioRef.current.play()
        }
      } catch (error) {
        console.error('Error playing next track:', error)
        setIsPlaying(false)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Audio event handlers
  const onLoadStart = () => {
    setIsLoading(true)
  }

  const onCanPlay = () => {
    setIsLoading(false)
    setError(null)
  }

  const onError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    console.error('Audio error:', e)
    setIsLoading(false)
    setIsPlaying(false)
    setError('Track failed')
    // Auto-skip to next track on error
    setTimeout(() => nextTrack(), 1000)
  }

  const onPlaying = () => {
    setIsPlaying(true)
    setIsLoading(false)
    setError(null)
  }

  const onPause = () => {
    setIsPlaying(false)
  }

  // Auto-advance when track ends - simplified logic
  const onEnded = async () => {
    console.log('Track ended, advancing to next...')
    const playlist = isShuffled ? shuffledPlaylist : (currentStation?.playlist || [])
    const nextIndex = (currentTrackIndex + 1) % playlist.length

    console.log(`Advancing from track ${currentTrackIndex + 1} to track ${nextIndex + 1}`)
    setCurrentTrackIndex(nextIndex)

    // Force play the next track after a short delay
    setTimeout(async () => {
      const nextTrack = playlist[nextIndex]
      if (nextTrack && audioRef.current) {
        try {
          console.log(`Auto-playing next track: ${nextTrack.name}`)
          audioRef.current.src = nextTrack.url
          audioRef.current.volume = 0.7
          await audioRef.current.play()
          setIsPlaying(true)
        } catch (error) {
          console.error('Failed to auto-play next track:', error)
          setIsPlaying(false)
        }
      }
    }, 100)
  }

  // Simple animated dots when playing
  const AnimatedDots = () => {
    if (!isPlaying) return <div className="text-[8px] text-muted-foreground">♪</div>

    return (
      <div className="flex items-center gap-[1px]">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="w-[2px] bg-green-500 rounded-sm animate-pulse"
            style={{
              height: Math.random() * 8 + 4 + 'px',
              animationDelay: i * 0.1 + 's',
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
    )
  }

  if (!currentStation || shuffledPlaylist.length === 0) {
    return null // Hide completely if no station or tracks
  }

  const currentTrack = getCurrentTrack()
  const playlist = isShuffled ? shuffledPlaylist : currentStation.playlist
  const trackCount = playlist.length
  const metadata = currentTrack ? trackMetadata[currentTrack.id] : null

  return (
    <div className={`flex flex-col gap-2 p-3 bg-card border rounded-lg ${className}`}>
      {/* Station info and track display */}
      <div className="flex items-center gap-2">
        <Radio className="w-3 h-3 text-green-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">
            {currentStation.name} ({currentTrackIndex + 1}/{trackCount})
          </div>
          {currentTrack && (
            <div className="text-[10px] text-muted-foreground truncate">
              {metadata?.title || currentTrack.name}
              {metadata?.duration && (
                <span className="ml-2">{formatDuration(metadata.duration)}</span>
              )}
            </div>
          )}
        </div>

        {/* Simple animated visualization */}
        <div className="flex-shrink-0 w-6 h-3 flex items-center justify-center bg-gray-950 border rounded">
          <AnimatedDots />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handlePlay}
          disabled={isLoading || isPlaying}
          className="h-6 w-6 p-0"
          title="Play"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={handlePause}
          disabled={!isPlaying}
          className="h-6 w-6 p-0"
          title="Pause"
        >
          <Pause className="w-3 h-3" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleNext}
          disabled={isLoading}
          className="h-6 w-6 p-0"
          title="Next Track"
        >
          <SkipForward className="w-3 h-3" />
        </Button>

        <Button
          size="sm"
          variant={isShuffled ? "default" : "ghost"}
          onClick={toggleShuffle}
          className="h-6 w-6 p-0"
          title={isShuffled ? "Shuffle On" : "Shuffle Off"}
        >
          <Shuffle className="w-3 h-3" />
        </Button>

        {/* Error indicator */}
        {error && (
          <div className="text-[10px] text-red-500 flex-shrink-0" title={error}>!</div>
        )}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onLoadStart={onLoadStart}
        onCanPlay={onCanPlay}
        onError={onError}
        onPlaying={onPlaying}
        onPause={onPause}
        onEnded={onEnded}
        preload="none"
      />
    </div>
  )
}
