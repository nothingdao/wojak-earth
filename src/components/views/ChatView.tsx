// src/components/views/ChatView.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, Send } from 'lucide-react'
import type { Character, Location, ChatMessage } from '@/types'

interface ChatViewProps {
  character: Character
  selectedLocation: Location | null
  chatMessages: ChatMessage[]
  onSendMessage: (message: string) => Promise<void>
  loading?: boolean
}

export function ChatView({
  character,
  selectedLocation,
  chatMessages,
  onSendMessage,
  loading = false
}: ChatViewProps) {
  const [chatInput, setChatInput] = useState('')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleImageError = (characterId: string) => {
    setImageErrors(prev => new Set(prev).add(characterId))
  }

  const getCharacterImageUrl = (message: ChatMessage) => {
    if (imageErrors.has(message.character?.id || '')) {
      return null
    }
    if (message.character?.imageUrl) {
      return message.character.imageUrl
    }
    return null
  }

  const handleSendClick = async () => {
    if (!chatInput.trim()) return

    await onSendMessage(chatInput)
    setChatInput('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendClick()
    }
  }

  const currentLocationName = selectedLocation ? selectedLocation.name : character.currentLocation.name

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <MessageCircle className="w-5 h-5" />
          {currentLocationName}
        </h3>
        <p className="text-sm text-muted-foreground">
          Local chat • {chatMessages.length} messages
        </p>
      </div>

      {/* Chat Messages */}
      <div className="bg-muted/30 rounded-lg p-3 h-64 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-muted-foreground scrollbar-track-muted">
        {chatMessages.length > 0 ? (
          chatMessages.map(message => (
            <div key={message.id} className="space-y-1">
              {message.isSystem ? (
                <div className="text-xs text-center text-muted-foreground italic">
                  {message.message}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center overflow-hidden bg-gray-300">
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

                    <span className={`font-medium ${message.character?.id === character.id
                      ? 'text-primary'
                      : ''
                      }`}>
                      {message.character?.name}
                      {message.character?.id === character.id && (
                        <span className="text-[10px] ml-1 opacity-60">(you)</span>
                      )}
                    </span>

                    <span className="text-muted-foreground">{message.timeAgo}</span>
                  </div>

                  <div className={`text-sm pl-6 ${message.character?.id === character.id
                    ? 'text-primary/90'
                    : ''
                    }`}>
                    {message.messageType === 'EMOTE' ? (
                      <span className="italic">*{message.message}*</span>
                    ) : (
                      message.message
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : loading ? (
          <div className="text-sm text-muted-foreground text-center">
            Loading messages...
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center">
            No messages yet. Be the first to say something!
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            maxLength={500}
            disabled={loading}
          />
          <Button
            size="sm"
            onClick={handleSendClick}
            disabled={!chatInput.trim() || loading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-right">
          {chatInput.length}/500
        </div>

        {/* Quick Emote Buttons */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setChatInput('/wave')}
            disabled={loading}
          >
            👋 Wave
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setChatInput('/dance')}
            disabled={loading}
          >
            💃 Dance
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setChatInput('/laugh')}
            disabled={loading}
          >
            😂 Laugh
          </Button>
        </div>
      </div>
    </div>
  )
}
