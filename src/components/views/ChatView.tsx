// src/components/views/ChatView.tsx - COMPLETELY NEW VERSION
import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Send, Loader } from 'lucide-react'
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
  messageType: 'SYSTEM',
  isSystem: true,
  timeAgo: 'now',
  createdAt: new Date().toISOString(),
  location: { id: '', name: '', locationType: '' }
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

  const locationId = selectedLocation?.id || character.currentLocation.id

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

  const chatParticipants = useChatPresence(locationId, character, {
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

  // NEW: Watch for our sent message to come back via subscription
  useEffect(() => {
    console.log('=== ChatMessages effect running ===', {
      messageCount: chatMessages.length,
      isSending,
      lastSentMessage,
      characterId: character.id
    })

    if (isSending && lastSentMessage && chatMessages.length > 0) {
      // Check all recent messages, not just the last one (in case other messages come in)
      const recentMessages = chatMessages.slice(-3) // Check last 3 messages

      for (const message of recentMessages) {
        console.log('Checking message:', {
          messageText: message.message,
          messageCharId: message.character?.id,
          ourCharId: character.id,
          lastSentMessage,
          textMatch: message.message === lastSentMessage,
          charMatch: message.character?.id === character.id
        })

        if (message.character?.id === character.id && message.message === lastSentMessage) {
          console.log('✅ Found our message! Re-enabling send button')
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

    // Mark as loaded when we get our first messages
    if (!hasLoadedMessages && newMessageCount > 0) {
      setHasLoadedMessages(true)
    }

    if (newMessageCount > lastMessageCountRef.current) {
      if (wasEmpty) {
        // First load - scroll to bottom immediately
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView()
          }
        }, 0)
      } else if (isAtBottom) {
        // User at bottom - scroll to new messages
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      } else {
        // User scrolled up - increment unread
        setUnreadCount(prev => prev + (newMessageCount - lastMessageCountRef.current))
      }
    }

    lastMessageCountRef.current = newMessageCount
  }, [chatMessages.length, isAtBottom, hasLoadedMessages])

  // Reset on location change
  useEffect(() => {
    console.log('Location changed, resetting state')
    lastPresenceRef.current = new Set()
    lastMessageCountRef.current = 0
    setIsAtBottom(true)
    setUnreadCount(0)
    setIsSending(false)
    setLastSentMessage(null)
    setHasLoadedMessages(false) // This should reset loading state
  }, [locationId])

  // ALSO reset when chatMessages gets cleared (when useGameData clears it)
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

  const handleImageError = useCallback((characterId: string) => {
    setImageErrors(prev => new Set(prev).add(characterId))
  }, [])

  const getCharacterImageUrl = useCallback((message: ChatMessage) => {
    if (imageErrors.has(message.character?.id || '')) return null
    return message.character?.imageUrl || null
  }, [imageErrors])

  const handleSendClick = async () => {
    if (!chatInput.trim() || isSending) return

    const messageText = chatInput.trim()
    console.log('🚀 Sending message:', messageText)

    // Clear input and set pending state immediately
    setChatInput('')
    setIsSending(true)
    setLastSentMessage(messageText)

    try {
      await onSendMessage(messageText)
      console.log('📤 Message sent to server')
      scrollToBottom()
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      // Re-enable on error
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
    <div className="space-y-4 relative">
      <div className="text-center">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <MessageCircle className="w-5 h-5" />
          {currentLocationName}
        </h3>
        <p className="text-sm text-muted-foreground">
          {chatParticipants} active participants
        </p>
      </div>

      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="bg-muted/30 rounded-lg p-3 h-64 overflow-y-auto"
      >
        {!hasLoadedMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader className="w-4 h-4 animate-spin" />
              Loading messages...
            </div>
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">
              No messages yet. Be the first to say something!
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {chatMessages.map(message => (
              <div key={message.id}>
                {message.isSystem ? (
                  <div className="text-xs text-center italic text-muted-foreground/70">
                    {message.message}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-10 h-10 rounded-lg bg-gray-300 flex items-center justify-center overflow-hidden">
                        {getCharacterImageUrl(message) ? (
                          <img
                            src={getCharacterImageUrl(message)!}
                            alt={message.character?.name || 'Character'}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(message.character?.id || '')}
                          />
                        ) : (
                          <span className="text-[8px]">
                            {message.character?.characterType === 'HUMAN' ? '🙂' : '👹'}
                          </span>
                        )}
                      </div>
                      <span className={`font-medium ${message.character?.id === character.id ? 'text-primary' : ''}`}>
                        {message.character?.name}
                        {message.character?.id === character.id && (
                          <span className="text-[10px] ml-1 opacity-60">(you)</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">{message.timeAgo}</span>
                    </div>
                    <div className={`text-sm pl-12 ${message.character?.id === character.id ? 'text-primary/90' : ''}`}>
                      {message.messageType === 'EMOTE' ? (
                        <span className="italic">*{message.message}*</span>
                      ) : (
                        message.message
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
          className="absolute bottom-16 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs shadow-lg hover:bg-primary/90"
        >
          {unreadCount} new ↓
        </button>
      )}

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={isSending ? "Sending..." : "Type your message..."}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            maxLength={500}
            disabled={!hasLoadedMessages || isSending}
          />
          <Button size="sm" onClick={handleSendClick} disabled={!hasLoadedMessages || isSending || !chatInput.trim()}>
            {isSending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          {chatInput.length}/500 {isSending && <span className="text-orange-500">• Sending...</span>}
        </div>
      </div>
    </div>
  )
}
