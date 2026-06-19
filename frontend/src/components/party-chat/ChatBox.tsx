import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../services/partyService'
import { ChatComposer } from './ChatComposer'
import { ChatMessageItem } from './ChatMessageItem'
import { Spinner } from '../UI'

type Props = {
  messages: ChatMessage[]
  isLoading?: boolean
  error?: string | null
  currentUserId?: string
  onSendText: (text: string) => void
  onSendFile: (file: File) => Promise<void>
  onSendAudio: (file: File, durationMs: number) => Promise<void>
}

export function ChatBox({ messages, isLoading, error, currentUserId = '', onSendText, onSendFile, onSendAudio }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable message list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm text-center p-5">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm text-center p-5">
            <p>{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm text-center p-5">
            <p>Sin mensajes todavía. ¡Sé el primero! 💬</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessageItem
              key={message.id}
              message={message}
              isOwn={Boolean(currentUserId) && message.userId === currentUserId}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Sticky composer — sticks above mobile nav via safe-area padding in ChatComposer */}
      <ChatComposer
        onSendText={onSendText}
        onSendFile={onSendFile}
        onSendAudio={onSendAudio}
      />
    </div>
  )
}
