import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../services/partyService'
import { ChatComposer } from './ChatComposer'
import { ChatMessageItem } from './ChatMessageItem'
import { Spinner } from '../UI'
import { MessageCircle } from 'lucide-react'

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
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-bg">
              <MessageCircle size={28} className="text-accent-light" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-primary">Todavía no hay mensajes</p>
            <p className="text-xs text-muted">Escribí abajo para romper el hielo 👋</p>
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
