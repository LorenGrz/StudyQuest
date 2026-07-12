import type { ChatMessage } from '../../services/partyService'
import { formatBytes, isAudioMessage } from './chatMessageGuards'

export function ChatMessageItem({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div
      className={`max-w-[85%] sm:max-w-md w-fit min-w-[140px] rounded-lg px-3.5 py-3 shadow-sm border ${
        isOwn
          ? 'self-end bg-[rgba(124,58,237,0.10)] border-[rgba(124,58,237,0.30)]'
          : 'self-start bg-surface border-edge'
      }`}
    >
      {!isOwn && (
        <span className="text-xs font-bold text-accent-light block mb-1">
          {message.user?.displayName ?? message.userId.slice(0, 8)}
        </span>
      )}

      {message.type === 'text' && message.text && (
        <p className="text-sm text-primary">{message.text}</p>
      )}

      {message.type === 'file' && message.attachment && (
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-start gap-2.5">
            <span className="w-9 h-9 rounded-lg inline-flex items-center justify-center bg-[var(--overlay-soft)] shrink-0 text-lg" aria-hidden="true">📄</span>
            <div className="min-w-0 flex flex-col gap-0.5">
              <a
                href={message.attachment.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent-light underline truncate block"
              >
                {message.attachment.name}
              </a>
              <span className="text-xs text-muted">
                {message.attachment.mimeType} · {formatBytes(message.attachment.sizeBytes)}
              </span>
            </div>
          </div>
        </div>
      )}

      {isAudioMessage(message) && message.attachment && (
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-start gap-2.5">
            <span className="w-9 h-9 rounded-lg inline-flex items-center justify-center bg-[var(--overlay-soft)] shrink-0 text-lg" aria-hidden="true">🎙️</span>
            <div className="min-w-0 flex flex-col gap-0.5">
              <strong className="text-sm text-primary">Nota de voz</strong>
              <span className="text-xs text-muted">
                {Math.max(1, Math.round((message.attachment.durationMs ?? 0) / 1000))}s · {formatBytes(message.attachment.sizeBytes)}
              </span>
            </div>
          </div>
          <audio className="w-full block" controls src={message.attachment.url} />
        </div>
      )}

      <span className="text-[11px] text-muted block mt-1.5">
        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}
