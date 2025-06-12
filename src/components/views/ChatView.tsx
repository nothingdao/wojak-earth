// src/components/views/ChatView.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Send,
  Loader,
  Terminal,
  Signal,
  Activity,
  Database,
  Eye,
  ArrowDown
} from 'lucide-react'
import { useChatPresence } from '@/hooks/useChatPresence'
import type { Character, Location, ChatMessage } from '@/types'

interface ChatViewProps {
  character: Character
  selectedLocation: Location | null
  chatMessages: ChatMessage[]
  onSendMessage: (message: string) => Promise<void>
  onAddPresenceMessage: (message: ChatMessage) => void
  loading?: boolean
}

const createPresenceMessage = (characterName: string, action: 'entered' | 'left'): ChatMessage => ({
  id: `presence-${Date.now()}-${Math.random()}`,
  message: `${characterName} has ${action} the chat`,
  message_type: 'SYSTEM',
  is_system: true,
  timeAgo: 'now',
  created_at: new Date().toISOString(),
  location: { id: '', name: '', location_type: '' }
})

export function ChatView({
  character,
  selectedLocation,
  chatMessages,
  onSendMessage,
  onAddPresenceMessage,
  loading = false
}: ChatViewProps) {
  const [chatInput, setChatInput] = useState('')
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null)
  const [hasLoadedMessages, setHasLoadedMessages] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const lastPresenceRef = useRef<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(0)

  const location_id = selectedLocation?.id || character.currentLocation.id

  // Handle presence changes
  const handlePresenceChange = useCallback((currentPresence: Array<{ name: string }>) => {
    const currentNames = new Set(currentPresence.map(p => p.name))
    const lastNames = lastPresenceRef.current

    if (lastNames.size === 0) {
      lastPresenceRef.current = currentNames
      return
    }

    currentNames.forEach(name => {
      if (!lastNames.has(name) && name !== character.name) {
        onAddPresenceMessage(createPresenceMessage(name, 'entered'))
      }
    })

    lastNames.forEach(name => {
      if (!currentNames.has(name) && name !== character.name) {
        onAddPresenceMessage(createPresenceMessage(name, 'left'))
      }
    })

    lastPresenceRef.current = currentNames
  }, [character.name, onAddPresenceMessage])

  const chatParticipants = useChatPresence(location_id, character, {
    onPresenceChange: handlePresenceChange
  })

  // Check scroll position
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 50

    if (atBottom && !isAtBottom) {
      setIsAtBottom(true)
      setUnreadCount(0)
    } else if (!atBottom && isAtBottom) {
      setIsAtBottom(false)
    }
  }, [isAtBottom])

  // Watch for our sent message to come back via subscription
  useEffect(() => {
    if (isSending && lastSentMessage && chatMessages.length > 0) {
      const recentMessages = chatMessages.slice(-3)

      for (const message of recentMessages) {
        if (message.character?.id === character.id && message.message === lastSentMessage) {
          setIsSending(false)
          setLastSentMessage(null)
          break
        }
      }
    }
  }, [chatMessages, isSending, lastSentMessage, character.id])

  // Handle new messages for scrolling
  useEffect(() => {
    const newMessageCount = chatMessages.length
    const wasEmpty = lastMessageCountRef.current === 0

    if (!hasLoadedMessages && newMessageCount > 0) {
      setHasLoadedMessages(true)
    }

    if (newMessageCount > lastMessageCountRef.current) {
      if (wasEmpty) {
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView()
          }
        }, 0)
      } else if (isAtBottom) {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        setUnreadCount(prev => prev + (newMessageCount - lastMessageCountRef.current))
      }
    }

    lastMessageCountRef.current = newMessageCount
  }, [chatMessages.length, isAtBottom, hasLoadedMessages])

  // Reset on location change
  useEffect(() => {
    lastPresenceRef.current = new Set()
    lastMessageCountRef.current = 0
    setIsAtBottom(true)
    setUnreadCount(0)
    setIsSending(false)
    setLastSentMessage(null)
    setHasLoadedMessages(false)
  }, [location_id])

  useEffect(() => {
    if (chatMessages.length === 0) {
      setHasLoadedMessages(false)
      lastMessageCountRef.current = 0
    }
  }, [chatMessages.length])

  const scrollToBottom = () => {
    setUnreadCount(0)
    setIsAtBottom(true)
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleImageError = useCallback((character_id: string) => {
    setImageErrors(prev => new Set(prev).add(character_id))
  }, [])

  const getCharacterimage_url = useCallback((message: ChatMessage) => {
    if (imageErrors.has(message.character?.id || '')) return null
    return message.character?.image_url || null
  }, [imageErrors])

  const handleSendClick = async () => {
    if (!chatInput.trim() || isSending) return

    const messageText = chatInput.trim()

    setChatInput('')
    setIsSending(true)
    setLastSentMessage(messageText)

    try {
      await onSendMessage(messageText)
      scrollToBottom()
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      setChatInput(messageText)
      setIsSending(false)
      setLastSentMessage(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendClick()
    }
  }

  const currentLocationName = selectedLocation ? selectedLocation.name : character.currentLocation.name

  return (
    <div className="bg-background sm:border sm:border-border sm:rounded font-mono h-[calc(100vh-theme(spacing.24))] flex flex-col">
      {/* Terminal Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-primary font-bold text-sm">COMMS_CHANNEL v2.089</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Signal className="w-3 h-3 animate-pulse text-green-500" />
          <span className="text-green-500">ONLINE</span>
        </div>
      </div>

      {/* Location & Status */}
      <div className="bg-muted border-b border-border p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-3 h-3 text-primary" />
            <span className="text-primary font-bold text-xs">
              SECTOR: {currentLocationName.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Activity className="w-3 h-3 text-blue-500" />
            <span className="text-muted-foreground">
              ACTIVE_USERS: {chatParticipants}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="bg-muted/50 p-3 flex-1 overflow-y-auto relative"
      >
        {!hasLoadedMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-card border border-border rounded p-3">
              <div className="flex items-center gap-2 text-sm text-primary font-mono">
                <Loader className="w-4 h-4 animate-spin" />
                INITIALIZING_COMM_LINK...
              </div>
            </div>
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-card border border-border rounded p-3 text-center">
              <div className="text-sm text-muted-foreground font-mono">
                <div className="text-primary font-bold mb-1">CHANNEL_EMPTY</div>
                <div className="text-xs">AWAITING_FIRST_TRANSMISSION...</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {chatMessages.map(message => (
              <div key={message.id}>
                {message.is_system ? (
                  <div className="bg-card border border-yellow-500/50 rounded p-1 my-1">
                    <div className="text-xs text-center text-yellow-600 font-mono">
                      <span className="text-yellow-500">▶</span> {message.message.toUpperCase()}
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded p-2 font-mono">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded border border-border bg-muted flex items-center justify-center overflow-hidden">
                        {getCharacterimage_url(message) ? (
                          <img
                            src={getCharacterimage_url(message)!}
                            alt={message.character?.name || 'Character'}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(message.character?.id || '')}
                          />
                        ) : (
                          <span className="text-[8px]">
                            {message.character?.character_type === 'HUMAN' ? '👤' : '🤖'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <span className={`font-bold ${message.character?.id === character.id
                          ? 'text-primary'
                          : 'text-foreground'
                          }`}>
                          {message.character?.name?.toUpperCase()}
                          {message.character?.id === character.id && (
                            <span className="text-primary/60 ml-1">[YOU]</span>
                          )}
                        </span>

                        <span className="text-muted-foreground/60">•</span>
                        <span className="text-muted-foreground text-[10px]">
                          {message.timeAgo.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className={`text-sm pl-8 ${message.character?.id === character.id
                      ? 'text-primary'
                      : 'text-foreground'
                      }`}>
                      {message.message_type === 'EMOTE' ? (
                        <span className="italic text-blue-500">
                          <span className="text-blue-600">*</span>
                          {message.message}
                          <span className="text-blue-600">*</span>
                        </span>
                      ) : (
                        <span className="font-mono">{message.message}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Unread messages indicator */}
      {!isAtBottom && unreadCount > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 bg-primary text-primary-foreground px-2 py-1 rounded border border-primary text-xs font-mono shadow-lg hover:bg-primary/90 flex items-center gap-1 animate-pulse"
        >
          <ArrowDown className="w-3 h-3" />
          {unreadCount}_NEW
        </button>
      )}

      {/* Input Section */}
      <div className="bg-muted border-t border-border p-3">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-mono font-bold">MESSAGE_INPUT</span>
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-mono">
            {chatInput.length}/500
          </span>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={isSending ? "TRANSMITTING..." : "ENTER_MESSAGE..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 bg-background border border-input rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring focus:border-input placeholder:text-muted-foreground"
              maxLength={500}
              disabled={!hasLoadedMessages || isSending}
            />
            {isSending && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Loader className="w-3 h-3 animate-spin text-primary" />
              </div>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleSendClick}
            disabled={!hasLoadedMessages || isSending || !chatInput.trim()}
            className="h-9 px-3 font-mono text-xs"
          >
            {isSending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3 h-3 mr-1" />
              </>
            )}
          </Button>
        </div>

        {isSending && (
          <div className="mt-1 text-xs text-orange-500 font-mono flex items-center gap-1">
            <Activity className="w-3 h-3 animate-pulse" />
            TRANSMISSION_IN_PROGRESS...
          </div>
        )}
      </div>
    </div>
  )
}
